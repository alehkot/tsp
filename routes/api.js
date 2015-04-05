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
            var MonteCarlo = require('./MonteCarlo');
            var algorithm = new MonteCarlo(model, method_params);
            break;
        case 'concorde':
            var Concorde = require('./Concorde');
            var algorithm = new Concorde(model, method_params);
            break;
        case 'greedy':
            var Greedy = require('./Greedy');
            var algorithm = new Greedy(model);
            break;
        case 'elastic-nets':
            var ElasticNets = require('./ElasticNets');
            var algorithm = new ElasticNets(coordinates, method_params, model, req);
            break;
    }
    if (algorithm) {
        algorithm.calculate();
        result = algorithm.buildSolution();
    }

    var end_time = new Date().getTime();
    console.log("Time elapsed: " + (end_time - start_time)/1000);
    res.json(result);
};
