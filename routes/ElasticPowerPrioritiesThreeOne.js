function ElasticPowerPriorities31(model) {
    this.model = model;
}

ElasticPowerPriorities31.prototype.setPriorities = function(priorities) {
    TSPCommon = require('./TSPCommon');
    this.priorities = priorities;
    this.priorities_grouped = TSPCommon._grouper(priorities, this.model.num_neurons);
};

ElasticPowerPriorities31.prototype.setPrioritiesRev = function(priorities) {
    this.priorities_rev = priorities;
};

ElasticPowerPriorities31.prototype.getPriorities = function(diff) {
    var numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');

    return this.priorities_grouped;

    //var diff_grouped = TSPCommon._grouper(diff, this.model.num_neurons);
    //diff_grouped = numeric.transpose(diff_grouped);
    //
    //var dist_2 = _.map(_.flatten(diff_grouped, true), function (value) {
    //    return Math.sqrt(Math.pow(value[0], 2) + Math.pow(value[1], 2));
    //});
    ////dist_2 = numeric.div(dist_2, _.max(dist_2));
    //
    //priorities = numeric.mul(priorities, dist_2);
    //return priorities;
};

ElasticPowerPriorities31.prototype.getPrioritiesRev = function(diff) {
    var numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');

    return this.priorities_rev;
    //
    //var dist_grouped = TSPCommon._grouper(dist, this.model.num_neurons);
    //dist_grouped = numeric.transpose(dist_grouped);
    //dist = _.flatten(dist_grouped, true);
    //
    //var dist_2 = _.map(diff, function (value) {
    //    return Math.sqrt(Math.pow(value[0], 2) + Math.pow(value[1], 2));
    //});
    //
    ////dist_2 = numeric.div(dist_2, _.max(dist_2));
    //
    //dist = numeric.mul(dist, dist_2);
    //
    //return dist;
};


ElasticPowerPriorities31.prototype.weightenNeurons = function(diff){
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');

    return this.getPriorities(diff);

    //var dist = this.getPriorities(diff) ? this.getPriorities(diff) : false;
    //var dist_grouped = TSPCommon._grouper(dist, this.model.num_neurons);
    //return dist_grouped;

    //var k = this.model.k;
    //if (k < 0.01) {
    //    k = 0.01;
    //}
    //
    ////var weights = numeric.exp(numeric.div(numeric.neg(numeric.pow(dist, 2)), (2 * Math.pow(1 - this.model.k, 2))));
    //var weights = numeric.exp(numeric.div(numeric.neg(numeric.pow(dist, 2)), (10 * Math.pow(k, 2))));
    //var grouped_neurons = TSPCommon._grouper(weights, this.model.num_neurons);
    //weights = _.map(grouped_neurons, function (value) {
    //    return numeric.div(value, numeric.sum(value));
    //});
    //
    //return weights;
};

ElasticPowerPriorities31.prototype.weightenNeuronsRev = function(diff){
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');

    var dist = this.getPrioritiesRev(diff) ? this.getPrioritiesRev(diff) : false;

    var k = this.model.k;
    if (k < 0.01) {
        k = 0.01;
    }
    //var weights = numeric.exp(numeric.div(numeric.neg(numeric.pow(dist, 2)), (2 * Math.pow(this.model.k, 2))));
    //var weights = numeric.exp(numeric.div(numeric.neg(numeric.pow(dist, 2)), (2 * Math.pow((1-this.model.k), 2))));
    var weights = numeric.exp(numeric.div(numeric.neg(numeric.pow(dist, 2)), (2 * Math.pow(k, 2))));
    var grouped_neurons = TSPCommon._grouper(weights, this.model.num_neurons);
    //grouped_neurons = numeric.transpose(grouped_neurons);
    weights = _.map(grouped_neurons, function (value) {
        return numeric.div(value, numeric.sum(value));
    });

    return weights;
};

ElasticPowerPriorities31.prototype.weightenDistances = function(diff) {
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');

    //var dist = _.map(diff, function (value) {
    //    return Math.sqrt(Math.pow(value[0], 2) + Math.pow(value[1], 2));
    //});
    //var stub = _.map(_.range(this.model.num_neurons), function(value){ return 1; });
    //
    //var dist_grouped = TSPCommon._grouper(dist, this.model.num_neurons);
    //var weights = _.map(dist_grouped, function(group){
    //   var min = _.min(group);
    //   if (min < 0.02) {
    //       var key_ext = _.indexOf(group, min);
    //       var new_stub = _.map(stub, function(val, key){
    //            if (key_ext != key) {
    //                return 0;
    //            }
    //            return val;
    //       });
    //       return new_stub;
    //   } else {
    //       return stub;
    //   }
    //});
    //return weights;

    var dist = _.map(diff, function (value) {
        return (Math.pow(value[0], 2) + Math.pow(value[1], 2));
    });

    // Create [num_items] groups of distances. In each of the group the distances
    // represent distance between group id (item) and neurons.
    var dist_grouped = TSPCommon._grouper(dist, this.model.num_neurons);
    var k = this.model.k;
    if (k < 0.01) {
        k = 0.01;
    }

    var weights = numeric.exp(numeric.div(numeric.neg(dist), (2 * Math.pow(k, 2))));

    var grouped_neurons = TSPCommon._grouper(weights, this.model.num_neurons);

    return grouped_neurons;

    //weights = _.map(grouped_neurons, function (value) {
    //    return numeric.div(value, numeric.sum(value));
    //});
    //return weights;

    //var weights_2 = _.map(weights, function(group){
    //    return numeric.div(group, _.max(group));
    //});
    //
    //return weights_2;
};

/**
 * Performs weights postprocessing.
 *
 * @param weights
 * @param weights_dist
 * @returns {*}
 */
ElasticPowerPriorities31.prototype.postprocessWeights = function(weights, weights_dist) {
    var numeric = require('numeric'),
        _ = require('underscore');

    //weights = numeric.transpose(numeric.mul(weights, weights_dist));
    //weights = _.map(weights, function(value){
    //    var sum = numeric.sum(value);
    //    value = _.map(value, function(weight){
    //        return weight /= sum;
    //    });
    //    return value;
    //});
    //weights = numeric.transpose(weights);
    //return weights;

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

    //weights = numeric.transpose(numeric.mul(weights, weights_dist));
    //weights = _.map(weights, function(value) {
    //    var sum = numeric.sum(value);
    //    value = _.map(value, function(weight) {
    //        return weight /= sum;
    //    });
    //    return value;
    //});
    //weights = numeric.transpose(weights);
    return weights;
};

/**
 * Calculates delta.
 *
 * @param diff
 * @param multiplicator
 * @returns {Array}
 */
ElasticPowerPriorities31.prototype.getNeuronsDelta = function(diff, multiplicator) {
    var numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');

    var weights = this.weightenNeurons(diff);
    //var weights_rev = this.weightenNeuronsRev(diff);
    var weights_dist = numeric.transpose(this.weightenDistances(diff));

    //weights = numeric.mul(weights, weights_dist);

    //var pairs = this.model.findPairs();
    //if (true || pairs.result.length == this.model.num_items) {
    //    weights = numeric.mul(weights, this.model.weightenBetterAlternatives());
    //}

    weights = this.postprocessWeights(weights, weights_dist);

    //weights_dist = numeric.transpose(weights_dist);
    //weights_dist = _.map(weights_dist, function(value){
    //    var sum = numeric.sum(value);
    //    value = _.map(value, function(weight){
    //        return weight /= sum;
    //    });
    //    return value;
    //});
    //weights_dist = numeric.transpose(weights_dist);
    //
    //weights = numeric.mul(weights, weights_dist);

    var diff_grouped = TSPCommon._grouper(diff, diff.length / this.model.coordinates.length),
        diff_grouped_transposed = numeric.transpose(diff_grouped),
        sum, sum1, sum2, part1, part2, part1_1, part1_2, part1_3, part1_4, j0, j1, j2, delta = [];

    for (j0 = 0; j0 < this.model.neurons.length; j0++) {
        part1_1 = numeric.transpose(diff_grouped_transposed[j0]);

        //part1_1 = _.map(part1_1, function(part1_1_value){
        //    return _.map(part1_1_value, function(sub){
        //        return 0.1;
        //    });
        //});

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

module.exports = ElasticPowerPriorities31;
