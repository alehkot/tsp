/**
 * Elastic Power Priorities.
 *
 * @param model
 * @constructor
 */
function ElasticPowerPriorities3(model) {
    this.model = model;
}

/**
 * Weightens distances.
 *
 * @param diff
 * @returns {Array}
 */
ElasticPowerPriorities3.prototype.weightenDistances = function(diff) {
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon'),
        weights,
        dist,
        dist_grouped,
        k = this.model.k;

    dist = _.map(diff, function (value) {
        return (Math.pow(value[0], 2) + Math.pow(value[1], 2));
    });

    // Create [num_items] groups of distances. In each of the group the distances
    // represent distance between group id (item) and neurons.
    dist_grouped = TSPCommon._grouper(dist, this.model.num_neurons);

    weights = numeric.exp(numeric.div(numeric.neg(dist), (2 * Math.pow(k, 2))));

    return TSPCommon._grouper(weights, this.model.num_neurons);
};

/**
 * Performs weights postprocessing.
 *
 * @param weights
 * @param weights_dist
 * @returns {*}
 */
ElasticPowerPriorities3.prototype.postprocessWeights = function(weights, weights_dist) {
    var numeric = require('numeric'),
        _ = require('underscore');

    weights_dist = numeric.transpose(weights_dist);
    weights_dist = _.map(weights_dist, function(value){
        var sum = numeric.sum(value);
        value = _.map(value, function(weight){
            return weight /= sum;
        });
        return value;
    });
    weights_dist = numeric.transpose(weights_dist);
    weights = numeric.mul(weights, weights_dist);

    return weights;
};

/**
 * Calculates delta.
 *
 * @param diff
 * @param multiplicator
 * @returns {Array}
 */
ElasticPowerPriorities3.prototype.getNeuronsDelta = function(diff, multiplicator) {
    var diff_grouped_transposed, diff_grouped, weights_dist, weights, sum1,
        part1, part1_1, part1_2, j0,
        delta = [],
        numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');

    weights = this.getPriorities();

    weights_dist = numeric.transpose(this.weightenDistances(diff));

    weights = this.postprocessWeights(weights, weights_dist);

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

module.exports = ElasticPowerPriorities3;
