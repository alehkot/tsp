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
            result = _elastic_nets_calculate(coordinates, method_params, model, req);
            break;
    }
    var end_time = new Date().getTime();
    console.log("Time elapsed: " + (end_time - start_time)/1000);
    res.json(result);
};

/**
 * Calculates optimal solution using Elastic Nets method.
 *
 * @param coordinates
 * @param method_params
 * @param model
 * @param req
 * @returns {*}
 * @private
 */
function _elastic_nets_calculate(coordinates, method_params, model, req) {
    var diff;
    var worst_dist;
    var weights;
    var weightening_result;
    var TSPResult = require('./TSPResult');
    var ElasticNetsPrinter = require('./ElasticNetsPrinter');
    var TSPCommon = require('./TSPCommon');
    var result = new TSPResult();
    var norm_coordinates_data = _elastic_nets_normalize_coordinates(coordinates);
    var printer = new ElasticNetsPrinter(k, coordinates, norm_coordinates_data);
    var norm_coordinates = norm_coordinates_data['norm_coordinates'];
    var centroid = _elastic_nets_centroid(norm_coordinates);
    var num_neurons = parseInt(coordinates.length * method_params.num_neurons_factor);

    var radius = method_params.radius;
    var num_iterations_max = method_params.num_iter_max;
    var iteration;
    var k = method_params.k;
    var neurons = !method_params.reoptimize ? _elastic_nets_generate_neurons(centroid, num_neurons, radius) : req.session.neurons;
    if (method_params.reoptimize) {
        console.log('Reoptimizing...');
        neurons = TSPCommon._add_distortion(neurons);
        //method_params.beta = 0.
    }
    var real_distances = _elastic_nets_get_real_distances(coordinates);
    var _ = require('underscore');

    // Print the initial state.
    //_output_image(ctx, coordinates, neurons, norm_coordinates_data, k, 0);
    printer.addPage(neurons, k, 0);

    for (iteration = 1; iteration <= num_iterations_max; iteration++) {
        console.log(iteration);

        // Update K?
        if (iteration % method_params.k_num_iter == 0) {
            //method_params.k_num_iter = _.random(1, 50);
            k *= method_params.k_alpha;
            if (k < 0.01) {
                k = 0.01;
            }

            // Print each iteration state.
            //_output_image(ctx, coordinates, neurons, norm_coordinates_data, k, iteration);
            printer.addPage(neurons, k, iteration);
        }

        weightening_result = _elastic_nets_weighten_neurons(norm_coordinates, neurons, num_neurons, k);
        weights = weightening_result.weights;
        worst_dist = weightening_result.worst_dist;
        diff = weightening_result.diff;

        if (worst_dist < method_params.epsilon || iteration >= num_iterations_max) {
            break;
        }

        neurons = _elastic_nets_update_neurons(diff, coordinates, weights, neurons, k, method_params, iteration);
    }

    var visited = _elastic_nets_solution(norm_coordinates, neurons);
    if (!method_params.reoptimize) {
        req.session.neurons = neurons;
    }

    // Make the loop.
    visited.push(visited[0]);

    result.setMinRoute(visited);

    //result.setMin(-1);

    result.setMin(TSPCommon._calculate_route_length(visited, model));

    // Output pdf file.
    //fs.writeFile('out.pdf', canvas.toBuffer());
    printer.printPages();

    return result.export();
}

/**
 * Map neurons to the closest items.
 *
 * @param norm_coordinates
 * @param neurons
 * @returns {*}
 * @private
 */
function _elastic_nets_solution(norm_coordinates, neurons) {
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');

    var assigned = [], pairs = [];
    // Foreach item.
    for (var i = 0; i < norm_coordinates.length; i++) {
        var min_distance = 99999;
        var j_min_distance = -1;
        for (var j = 0; j < neurons.length; j++) {
            var distance = TSPCommon._get_distance(norm_coordinates[i], neurons[j])
            if (distance < min_distance && !_.contains(assigned, j)) {
                j_min_distance = j;
                min_distance = distance;
            }
        }
        assigned.push(j_min_distance);
        pairs.push([i, j_min_distance]);
    }

    pairs = _.sortBy(pairs, function (pair) {
        return pair[1];
    });

    return _.pluck(pairs, 0);
}

function _elastic_nets_update_neurons(diff, coordinates, weights, neurons, k, method_params, iteration) {
    var numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');
    var diff_grouped = TSPCommon._grouper(diff, diff.length / coordinates.length),
        diff_grouped_transposed = numeric.transpose(diff_grouped),
        weights_transposed = numeric.transpose(weights),
        sum, part1, part2, j0, j1, j2, delta = [];
    if (k < 0.1 && method_params.beta == 2) {
        //console.log('activated');
        //method_params.beta = 4.5;
    }

    for (j0 = 0; j0 < neurons.length; j0++) {
        if (method_params.beta == 10) {
            //console.log('activated');
        }
        j1 = (j0 + 1) % neurons.length;
        j2 = (j0 - 1) % neurons.length;
        if (j1 < 0) {
            j1 = neurons.length - j1;
        }
        if (j2 < 0) {
            // + because minus on minus.
            j2 = neurons.length + j2;
        }

        var part1_1 = numeric.transpose(diff_grouped_transposed[j0]);
        var part1_2 = weights_transposed[j0];
        //part1 = numeric.mul(part1, part2);
        part1 = _.map(part1_1, function (value, key) {
            return numeric.mul(value, part1_2);
        });
        part1 = _.map(part1, function (value) {
            return numeric.sum(value);
        });

        part2 = numeric.add(numeric.sub(neurons[j1], numeric.mul(neurons[j0], 2)), neurons[j2]);

        var sum1 = numeric.mul(part1, method_params.alpha);
        //console.log(k);
        var sum2 = numeric.mul(part2, method_params.beta * k);
        sum = numeric.add(sum1, sum2);
        delta.push(sum);
    }

    for (j0 = 0; j0 < delta.length; j0++) {
        neurons[j0] = _.map(neurons[j0], function (value) {
            return parseFloat(value);
        });
        delta[j0] = _.map(delta[j0], function (value) {
            return parseFloat(value);
        });
        _.map(neurons[j0], function (value, key) {
            neurons[j0][key] += delta[j0][key];
        });
    }

    return neurons;
}

/**
 * Calculates weights of neurons and the worst distance.
 *
 * @param norm_coordinates
 * @param neurons
 * @param num_neurons
 * @param k
 * @returns {{weights: *, worst_dist: number, diff: *}}
 * @private
 */
function _elastic_nets_weighten_neurons(norm_coordinates, neurons, num_neurons, k) {
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');

    var dist_grouped, worst_dist, cp_coordinates_neurons, diff, dist, weights;

    // Calculates distances between each of the items and each of the neurons.
    cp_coordinates_neurons = TSPCommon._cartesian_product_of(norm_coordinates, neurons);
    diff = _.map(cp_coordinates_neurons, function (value) {
        return numeric.sub(value[0], value[1]);
    });

    dist = _.map(diff, function (value) {
        return Math.pow(value[0], 2) + Math.pow(value[1], 2);
    });

    // Create [num_items] groups of distances. In each of the group the distances
    // represent distance between group id (item) and neurons.
    dist_grouped = TSPCommon._grouper(dist, num_neurons);
    worst_dist = Math.sqrt(_.reduce(dist_grouped, function (memo, value) {
        var min = _.min(value);
        return min > memo ? min : memo;
    }, 0));

    // exp(-d^2 / 2k^2)
    weights = numeric.exp(numeric.div(numeric.neg(dist), (2 * Math.pow(k, 2))));
    var grouped_neurons = TSPCommon._grouper(weights, num_neurons);

    weights = _.map(grouped_neurons, function (value) {
        return numeric.div(value, numeric.sum(value));
    });

    return {
        weights: weights,
        worst_dist: worst_dist,
        diff: diff
    };
}

/**
 * Returns the distances between every item.
 *
 * @param coordinates
 * @returns {*}
 * @private
 */
function _elastic_nets_get_real_distances(coordinates) {
    var numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');
    var distances = numeric.rep([coordinates.length, coordinates.length], 0);
    _.each(coordinates, function (value_i, i) {
        _.each(coordinates, function (value_j, j) {
            if (i != j) {
                distances[i][j] = TSPCommon._get_distance(value_i, value_j);
            }
        });
    });
    return distances;
}

/**
 * Generates specified number of neurons on a centroid.
 *
 * They are distributed uniformly.
 *
 * @param centroid
 * @param num_neurons
 * @param radius
 * @returns {*}
 * @private
 */
function _elastic_nets_generate_neurons(centroid, num_neurons, radius) {
    var numeric = require('numeric'),
        _ = require('underscore');

    //var theta = numeric.linspace(0, 2 * Math.PI, num_neurons);
    var theta = [];
    var linspace_max = 2 * Math.PI;
    for (var i = 0; i < num_neurons; i++) {
        theta.push(linspace_max * i / num_neurons);
    }

    var xpos = numeric.mul(radius, numeric.cos(theta));
    var ypos = numeric.mul(radius, numeric.sin(theta));

    xpos = numeric.addeq(xpos, centroid[0]);
    ypos = numeric.addeq(ypos, centroid[1]);

    return _.zip(xpos, ypos);
}

/**
 * Generates centroid for the given set of coordinates.
 *
 * @param norm_coordinates
 * @returns {*[]}
 * @private
 */
function _elastic_nets_centroid(norm_coordinates) {
    var _ = require('underscore'),
        math = require('mathjs');

    var reduced_matrix = _.reduce(norm_coordinates, function (memo, value) {
        return [memo[0] + value[0], memo[1] + value[1]];
    });

    return [reduced_matrix[0] / norm_coordinates.length, reduced_matrix[1] / norm_coordinates.length];
}

/**
 * Normalizes coordinates.
 *
 * @param coordinates
 * @returns {*}
 * @private
 */
function _elastic_nets_normalize_coordinates(coordinates) {
    var _ = require('underscore');

    var min_width = _.min(_.pluck(coordinates, 0));
    var max_width = _.max(_.pluck(coordinates, 0));
    var min_height = _.min(_.pluck(coordinates, 1));
    var max_height = _.max(_.pluck(coordinates, 1));
    var norm_coordinates = _.map(coordinates, function (value) {
        return [(value[0] - min_width) / (max_width - min_width), (value[1] - min_height) / (max_height - min_height)];
    });

    return {
        'norm_coordinates': norm_coordinates,
        'min_width': min_width,
        'min_height': min_height,
        'max_width': max_width,
        'max_height': max_height
    };
}

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
