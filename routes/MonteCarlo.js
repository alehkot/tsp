/**
 * Monte-Carlo TSP Solver.
 *
 * @todo Use JavaScript inheritance.
 *
 * @param model
 * @param method_params
 * @constructor
 */
function MonteCarlo(model, method_params) {
    this.model = model;
    this.method_params = method_params;
    var TSPResult = require('./TSPResult');
    this.result = new TSPResult();
    this._ = require('underscore');
    this.math = require('mathjs');
    this.tsp_common = require('./TSPCommon');
    this.INFINITE = 9999999;
}

/**
 * Calculates the solution.
 */
MonteCarlo.prototype.calculate = function() {
    var _ = this._,
        math = this.math,
        tsp_common = this.tsp_common,
        num_iterations = this.method_params.num_iterations,
        model = this.model,
        num_items = this.model.length;

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
    inf_diag_matrix = math.diag(math.matrix().resize([model.length], this.INFINITE));

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
        distance_history[k] = tsp_common._calculate_route_length(route, model);
    }

    max = _.max(distance_history);
    min = _.min(distance_history);
    max_route = routes_history[_.indexOf(distance_history, max)];
    min_route = routes_history[_.indexOf(distance_history, min)];

    this.result.setLowerBound(lower_bound);
    this.result.setMinRoute(min_route);
    this.result.setMaxRoute(max_route);
    this.result.setMin(min);
    this.result.setMax(max);
};

/**
 * Returns the solution.
 *
 * @returns {{min, max, min_route, max_route, lower_bound}}
 */
MonteCarlo.prototype.buildSolution = function() {
    return this.result.export();
};

module.exports = MonteCarlo;
