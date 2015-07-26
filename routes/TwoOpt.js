/**
 * Two Opt Post-optimization.
 *
 * @param model
 * @param route
 * @constructor
 */
function TwoOpt(model, route) {
    this._ = require('underscore');
    this.model = model;
    // We don't need to touch the base route.
    this.route = this._.clone(route);
}

/**
 * Uses Hills Climbing (2-opt) approach to find a better solution.
 *
 * @returns {*}
 *   New permutation.
 */
TwoOpt.prototype.process = function() {
    var aux_available = true, delta;
    while (aux_available) {
        delta = 0;
        // Don't include the last element.
        var max_index;
        for (var i = 0; i < this.model.length - 1; i++) {
            // @todo Check.
            max_index = (i != 0) ? this.model.length : this.model.length - 1;
            for (var j = i + 1; j < max_index; j++) {
                delta = 0;

                // @hack
                // Since Javascript doesn't have a concept of negative indexes.
                var a_el = i - 1;
                if (a_el < 0) {
                    a_el = this.model.length + Math.abs(a_el);
                }

                // a_el usually i - 1.
                var a = this.route[a_el % this.model.length];
                var b = this.route[i];
                var c = this.route[j];
                var d = this.route[(j + 1) % this.model.length];

                // Calculate usefulness of the move.
                // Since we are replacing connectors between a, b and c, d
                // with a, c and b, d we need to distract (a, b) and (c, d)
                // and add new relationship weight: (a, c) and (b, d).
                delta -= this.model[a][b];
                delta -= this.model[c][d];
                delta += this.model[a][c];
                delta += this.model[b][d];

                if (delta < 0) {
                    var start_i = i, start_j = j, tmp;
                    while (start_i < start_j) {
                        tmp = this.route[start_i];
                        this.route[start_i] = this.route[start_j];
                        this.route[start_j] = tmp;
                        start_i++;
                        start_j--;
                    }
                }
            }
        }
        if (delta >= 0) {
            break;
        }
    }
    return this.route;
};

module.exports = TwoOpt;
