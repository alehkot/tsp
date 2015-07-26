var _super = require('./ElasticPowerPrioritiesThree').prototype,
    method = ElasticPowerPrioritiesAP.prototype = Object.create( _super);

method.constructor = ElasticPowerPrioritiesAP;

/**
 * Elastic Nets Power.
 *
 * @param model
 * @constructor
 */
function ElasticPowerPrioritiesAP(model, priorities) {
    _super.constructor.apply(this, arguments);
    this.setPriorities(priorities);
}

/**
 * Calculates delta.
 *
 * @param diff
 * @param multiplicator
 * @returns {Array}
 */
method.getNeuronsDelta = function(diff, multiplicator) {
    var diff_grouped_transposed, diff_grouped, weights_dist, weights, sum1,
        part1, part1_1, part1_2, j0,
        delta = [],
        numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');

    weights = this.getPriorities();

    weights_dist = numeric.transpose(_super.weightenDistances.call(this, diff));

    if (this.model.iteration > 5000) {
        weights = _super.postprocessWeights.call(this, weights, weights_dist);
    }

    diff_grouped = TSPCommon._grouper(diff, diff.length / this.model.coordinates.length);
    diff_grouped_transposed = numeric.transpose(diff_grouped);

    for (j0 = 0; j0 < this.model.neurons.length; j0++) {
        part1_1 = numeric.transpose(diff_grouped_transposed[j0]);

        part1_2 = weights[j0];

        part1 = _.map(part1_1, function (value, key) {
            return numeric.mul(value, part1_2);
        });

        part1 = _.map(part1, function (value) {
            return numeric.sum(value);
        });

        sum1 = numeric.mul(part1, multiplicator);
        delta.push(sum1);
    }
    return delta;
};

/**
 * Sets the priorities.
 *
 * @param priorities
 */
method.setPriorities = function(priorities) {
    var TSPCommon = require('./TSPCommon');
    this.priorities = priorities;
    this.priorities_grouped = TSPCommon._grouper(priorities, this.model.num_neurons);
};

/**
 * Returns grouped priorities.
 *
 * @returns {Array|*}
 */
method.getPriorities = function() {
    return this.priorities_grouped;
};

module.exports = ElasticPowerPrioritiesAP;
