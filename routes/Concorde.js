/**
 * Concorde TSP Solver.
 *
 * @param model
 * @param method_params
 * @constructor
 */
function Concorde(model, method_params) {
    this.method_params = method_params;
    this.model = model;
    var TSPCommon = require('./TSPCommon'),
        TSPResult = require('./TSPResult');
    this.result = new TSPResult();
    this.temp_dir = TSPCommon._get_temp_directory();
    this._ = require('underscore');
    this.fs = require('fs');

    // Sometimes Concorde fails to find a solution
    // but restarting solves the problem.
    this.max_tries = 20;

    // Generate model text file.
    this.model_path = this._modelToTSPLib(this.model);
}

/**
 * Calculates the solution.
 */
Concorde.prototype.calculate = function() {
    var fs = require('fs'),
        _ = this._,
        child_process = require('child_process'),
        model_path = this.model_path;
    var matches, output, result = this.result, route, num_tries = this.max_tries;
    var regexp_solution_length = new RegExp(/^Optimal Solution\:\s*(\w+)/m);
    cd(this.temp_dir);

    while (num_tries > 0) {
        try {
            output = child_process.execSync('concorde ' + model_path);
        } catch (ex) {
            continue;
        }

        matches = output.toString().match(regexp_solution_length);

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
};

/**
 * Returns the solution.
 *
 * @returns {{min, max, min_route, max_route, lower_bound}}
 */
Concorde.prototype.buildSolution = function() {
    return this.result.export();
};

/**
 * Generate Concorde model text file.
 *
 * @param model
 * @param method_params
 * @returns {string|*}
 * @private
 */
Concorde.prototype._modelToTSPLib = function(model) {
    var crypto = require('crypto'),
        shelljs = require('shelljs/global'),
        fs = require('fs'),
        os = require('os'),
        _ = require('underscore');

    var num_items = this.model.length;

    var text, tempnam, model_path, data_array, data, regexp_solution_length, weights_array, weights, flat_model;

    text = '';
    tempnam = crypto.randomBytes(4).toString('hex');
    model_path = this.temp_dir + '/tsp_' + tempnam;

    data_array = [];
    data = '';
    weights_array = [];
    weights = '';
    flat_model = _.flatten(model);
    flat_model = _.map(flat_model, function (val) {
        return Number(val).toFixed(0);
    });
    weights = '  ' + flat_model.join(' ');

    data_array.push('NAME: ' + this.method_params.name);
    data_array.push('TYPE: TSP');
    data_array.push('COMMENT: ' + this.method_params.description);
    data_array.push('DIMENSION: ' + num_items);
    data_array.push('EDGE_WEIGHT_TYPE: EXPLICIT');
    data_array.push('EDGE_WEIGHT_FORMAT: FULL_MATRIX');
    data_array.push('EDGE_WEIGHT_SECTION');
    data_array.push(weights);
    data_array.push('EOF');
    data = data_array.join(os.EOL);
    fs.writeFileSync(model_path, data);
    return model_path;
};

module.exports = Concorde;
