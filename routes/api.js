"use strict";

/**
 * Handler for /api/generate.
 *
 * @param req
 * @param res
 */
exports.generate = function (req, res) {
    var math = require('mathjs');
    var min = req.query.min ? Math.abs(parseInt(req.query.min)) : 1,
        max = req.query.max ? Math.abs(parseInt(req.query.max)) : 100,
        num = req.query.num ? Math.abs(parseInt(req.query.num)) : 100,
        sym = typeof req.query.sym !== 'undefined' ? JSON.parse(req.query.sym) : true,
        reflect = req.query.reflect ? req.query.reflect : 'upper',
        matrix_wrapper;

    // Init with random values.
    matrix_wrapper = math.zeros(
        num,
        num
    ).map(function (value, index, matrix) {
        if (index[0] !== index[1]) {
            return math.randomInt(min, max);
        } else {
            return 0;
        }
    });

    // Make symmetric.
    if (sym === true) {
        matrix_wrapper = matrix_wrapper.map(function (value, index, matrix) {
            if (index[0] < index[1]) {
                return matrix.get([index[1], index[0]], value);
            } else {
                return value;
            }
        });
    }

    res.json({
        items: matrix_wrapper.toArray()
    });
};

/**
 * Handler for /api/reoptimize.
 *
 * @param req
 * @param res
 */
exports.reoptimize = function (req, res) {
    var _ = require('underscore'),
        model = Array.prototype.slice.call(req.body.model, 0),
        num_iterations = req.body.num_iterations ? Math.abs(parseInt(req.body.num_iterations)) : 1000,
        num_items = req.body.num_items ? Math.abs(parseInt(req.body.num_items)) : 1,
        result = req.body.result ? {
            base: req.body.result
        } : {},
        diff = 0,
        i,
        modified_model;

    for (i = 0; i < 1000; i++) {
        modified_model = _.clone(model);
        _touch_model(modified_model, 'move');

        result.modified_result = _monte_carlo_calculate(modified_model, num_items, num_iterations);
        // diff += Math.abs(
        //   _calculate_route_length(result.base.min_route, modified_model) - result.modified_result.min
        // ) / result.modified_result.min;
        diff += Math.abs(
            _calculate_route_length(result.base.min_route, modified_model) - result.modified_result.min
        );

        /*if (_.isEqual(result.base.min_route, result.modified_result.min_route)) {
         num_equals++;
         }*/
    }

    console.log(diff / i);

    res.json({});
};

/**
 * Handler for /api/parse.
 *
 * @param req
 * @param res
 */
exports.parse = function (req, res) {
    var fs = require('fs'),
        readline = require('readline'),
        busboy = require('connect-busboy'),
        _ = require('underscore');
    var TSPLibParserData = require('./TSPLibParserData');

    var fstream;
    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
        console.log("Uploading: " + filename);
        fstream = fs.createWriteStream(__dirname + '/../files/' + filename);
        file.pipe(fstream);
        fstream.on('close', function () {
            var regexp_type = new RegExp(/TYPE\s*\:\s*TSP/m),
                regexp_edge_weight_type = new RegExp(/^EDGE_WEIGHT_TYPE \: EUC_2D$/),
                regexp_node_coord_section = new RegExp(/^NODE_COORD_SECTION$/),
                regexp_dimension = new RegExp(/^DIMENSION\s*:\s*(\d+)$/),
                regexp_coords = new RegExp(/(\d+)/g),
                dimension = 0,
                matches,
                x,
                y,
                type,
                edge_weight_type,
                items = [],
                data_lines = false,
                distances,
                tsplib_obj;

            data = fs.readFileSync(this.path).toString();
            tsplib_obj = new TSPLibParserData(data);
            res.json({
                items: tsplib_obj.getDistances()
            });

        });
    });
};

exports.plotToMatrix = function (req, res) {
    var _ = require('underscore'),
        math = require('mathjs');

    var num = req.body.params.num ? Math.abs(parseInt(req.body.params.num)) : 100,
        distances = req.body.params.distances ? _.toArray(req.body.params.distances) : [],
        matrix_wrapper;

    // Init with random values.
    matrix_wrapper = math.zeros(
        num,
        num
    );

    _.each(distances, function (element, index, list) {
        matrix_wrapper.set([element['e1'], element['e2']], element['distance']);
    });

    res.json({
        items: matrix_wrapper.toArray()
    });
};

/**
 * Hanler for /api/calculate.
 *
 * @param req
 * @param res
 */
exports.calculate = function (req, res) {
    var _ = require('underscore'),
        math = require('mathjs');

    var model = Array.prototype.slice.call(req.body.model, 0),
        num_iterations = req.body.num_iterations ? Math.abs(parseInt(req.body.num_iterations)) : 1000,
        num_items = req.body.num_items ? Math.abs(parseInt(req.body.num_items)) : 1,
        method = req.body.method ? req.body.method : 'monte-carlo',
        method_params = req.body.method_params ? req.body.method_params : {},
        coordinates = req.body.coordinates ? req.body.coordinates : [];

    var start_time = new Date().getTime();
    var result = {};
    switch (method) {
        case 'monte-carlo':
            result = _monte_carlo_calculate(model, num_items, num_iterations);
            break;
        case 'concorde':
            result = _concorde_calculate(_model_to_tsplib(model, num_items, 'EUC_2D', method_params));
            break;
        case 'greedy':
            result = _greedy_calculate(model, num_items);
            break;
        case 'elastic-nets':
            var ElasticNets = require('./ElasticNets');
            var algorithm = new ElasticNets(coordinates, method_params, model, req);
            algorithm.calculate();
            result = algorithm.buildSolution();
            break;
    }
    var end_time = new Date().getTime();
    console.log("Time elapsed: " + (end_time - start_time)/1000);
    res.json(result);
};

/**
 * Calculates optimal solution using Greedy method.
 *
 * @param model
 * @param num_items
 * @returns {*}
 * @private
 */
function _greedy_calculate(model, num_items) {
    var tmp_model;
    var _ = require('underscore'),
        TSPResult = require('./TSPResult'),
        result = new TSPResult(),
        math = require('mathjs');
    var i, j, min = 9999999, visited = [], current_city = 0, inf_diag_matrix, lower_bounds_i;

    // Calculate lower bound.
    // Generate diag matrix with main diag equals to a big number.
    inf_diag_matrix = math.diag(math.matrix().resize([model.length], 9999999));

    tmp_model = math.matrix(model);

    // Sum diag matrix with the original matrix to make all diag elements big.
    tmp_model = math.add(tmp_model, inf_diag_matrix);

    var route_length = 0;

    while (visited.length < num_items) {
        // Calculate minimum of rows.
        lower_bounds_i = math.min(tmp_model, 1);

        // Calculate minimum of the current item_num rows.
        min = lower_bounds_i.get([current_city]);

        // Iterate horizontal vector of the current item_num distances.
        math.subset(tmp_model, math.index(current_city, [0, num_items])).forEach(function (value, index) {
            // If distance to a new item_num is minimal.
            if (value == min) {
                // Don't revisit the current item_num.
                tmp_model.set([current_city, index[0]], 9999999);

                // We don't want to revisit the item_num we are going to right now.
                tmp_model = math.transpose(tmp_model);
                tmp_model = math.subset(tmp_model, math.index(index[0], [0, num_items]), math.range(9999999, 9999999 + num_items));
                tmp_model = math.transpose(tmp_model);

                // Make the next item_num current.
                current_city = index[0];
            }
        });

        visited.push(current_city);
        route_length += min;
    }

    // Make the loop.
    route_length += model[visited[visited.length - 1]][visited[0]];
    visited.push(visited[0]);

    result.setMinRoute(visited);
    result.setMin(route_length);
    return result.export();
}

/**
 * Returns path to TSPLib file generated from model.
 *
 * @param model
 * @param num_items
 * @param type
 * @param method_params
 * @returns {string}
 * @private
 */
function _model_to_tsplib(model, num_items, type, method_params) {
    var crypto = require('crypto'),
        shelljs = require('shelljs/global'),
        fs = require('fs'),
        os = require('os'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');

    var text, tempnam, model_path, data_array, data, regexp_solution_length, weights_array, weights, flat_model;

    text = '';
    tempnam = crypto.randomBytes(4).toString('hex');
    model_path = TSPCommon._get_temp_directory() + '/tsp_' + tempnam;

    data_array = [];
    data = '';
    weights_array = [];
    weights = '';
    flat_model = _.flatten(model);
    flat_model = _.map(flat_model, function (val) {
        return Number(val).toFixed(0);
    });
    weights = '  ' + flat_model.join(' ');

    data_array.push('NAME: ' + method_params.name);
    data_array.push('TYPE: TSP');
    data_array.push('COMMENT: ' + method_params.description);
    data_array.push('DIMENSION: ' + num_items);
    data_array.push('EDGE_WEIGHT_TYPE: EXPLICIT');
    data_array.push('EDGE_WEIGHT_FORMAT: FULL_MATRIX');
    data_array.push('EDGE_WEIGHT_SECTION');
    data_array.push(weights);
    data_array.push('EOF');
    data = data_array.join(os.EOL);
    fs.writeFileSync(model_path, data);
    return model_path;
}

/**
 * Calculates optimal solution using Concorde.
 *
 * Concorde should be installed beforehand and its binary should be available via shell.
 *
 * @param model_path
 * @returns {*}
 * @private
 */
function _concorde_calculate(model_path) {
    var exec_sync = require('exec-sync'),
        fs = require('fs'),
        _ = require('underscore'),
        TSPResult = require('./TSPResult');
    var matches, output, result, route, num_tries = 20;
    var regexp_solution_length = new RegExp(/^Optimal Solution\:\s*(\w+)/m);
    cd(tempdir());

    result = new TSPResult();

    while (num_tries > 0) {
        output = exec_sync('concorde ' + model_path, true);
        if (output.stderr.length > 0) {
            continue;
        }
        matches = output.stdout.match(regexp_solution_length);

        if (matches.length) {
            result.setMin(parseFloat(matches[1]));
            var solution_data = fs.readFileSync(model_path + '.sol').toString();
            var lines = '';
            solution_data.split(/\r?\n/).forEach(function (line, index, array) {
                if (line.length > 0 && index > 0) {
                    lines += ' ' + line.trim();
                }
                route = lines.trim().split(' ');
                route = _.map(route, function (val) {
                    return parseInt(val);
                });

                // Make the loop.
                route.push(0);
                result.setMinRoute(route);
            });
            break;
        }
    }

    return result.export();
}



/**
 * Calculates optimal solution using Monte-Carlo method.
 *
 * @param model
 * @param num_items
 * @param num_iterations
 * @returns {{max: *, min: *, max_route: *, min_route: *, lower_bound: number}}
 * @private
 */
function _monte_carlo_calculate(model, num_items, num_iterations) {
    var _ = require('underscore'),
        math = require('mathjs'),
        TSPCommon = require('./TSPCommon');

    var local_optimum = 0,
        optimal_route = [],
        routes_history = [],
        distance_history = [],
        lower_bounds_i = [],
        lower_bounds_j = [],
        lower_bound = 0,
        tmp_model,
        inf_diag_matrix,
        i,
        k,
        max,
        min,
        distance = 0,
        max_route,
        min_route;

    // Calculate lower bound.
    // Generate diag matrix with main diag equals to a big number.
    inf_diag_matrix = math.diag(math.matrix().resize([model.length], 999999));

    tmp_model = math.matrix(model);

    // Sum diag matrix with the original matrix to make all diag elements big.
    tmp_model = math.add(tmp_model, inf_diag_matrix);

    // Calculate minimums of rows and transpose for the next operation.
    lower_bounds_i = math.transpose(math.min(tmp_model, 1));

    // Substract vector from  the matrix.
    tmp_model = math.subtract(tmp_model, lower_bounds_i);

    // Calculate minimums of columns.
    lower_bounds_j = math.min(tmp_model, 0);

    // To get a lower bound just sum the minimums of rows and columns.
    lower_bound = math.sum(lower_bounds_i) + math.sum(lower_bounds_j);

    for (k = 0; k < num_iterations; k++) {
        var permutations = [];

        var route = [];

        // Don't include item 0,to...
        for (i = 1; i < num_items; i++) {
            route.push(i);
        }

        route = _.shuffle(route);

        // ... always start in item_num 0.
        route.unshift(0);

        route.push(route[0]);
        routes_history[k] = route;
        distance_history[k] = TSPCommon._calculate_route_length(route, model);
    }

    max = _.max(distance_history);
    min = _.min(distance_history);
    max_route = routes_history[_.indexOf(distance_history, max)];
    min_route = routes_history[_.indexOf(distance_history, min)];

    return {
        'max': max,
        'min': min,
        'max_route': max_route,
        'min_route': min_route,
        'lower_bound': lower_bound
    };
}
