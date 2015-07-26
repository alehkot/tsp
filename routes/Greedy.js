/**
 * Greedy TSP Solver.
 *
 * @param model
 * @constructor
 */
function Greedy(model) {
    this._ = require('underscore');
    this.math = require('mathjs');
    var TSPResult = require('./TSPResult');
    this.result = new TSPResult();
    this.model = model;
    this.INFINITE = 9999999;
}

/**
 * Calculates the solution.
 */
Greedy.prototype.calculate = function() {
    var tmp_model, model = this.model;
    var num_items = this.model.length;
    var _ = this._,
        result = this.result,
        math = this.math,
        INFINITE = this.INFINITE;
    var i, j, min = 9999999, visited = [], current_city = 0, inf_diag_matrix, lower_bounds_i;

    // Calculate lower bound.
    // Generate diag matrix with main diag equals to a big number.
    inf_diag_matrix = math.diag(math.matrix().resize([model.length], this.INFINITE));

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
                tmp_model.set([current_city, index[0]], INFINITE);

                // We don't want to revisit the item_num we are going to right now.
                tmp_model = math.transpose(tmp_model);
                tmp_model = math.subset(tmp_model, math.index(index[0], [0, num_items]), math.range(INFINITE, INFINITE + num_items));
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
};

/**
 * Returns the solution.
 *
 * @returns {{min, max, min_route, max_route, lower_bound}}
 */
Greedy.prototype.buildSolution = function() {
    return this.result.export();
};

module.exports = Greedy;
