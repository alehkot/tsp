function ElasticPowerPriorities32(model) {
    this.model = model;
}

ElasticPowerPriorities32.prototype.setPriorities = function(priorities) {
    this.priorities = priorities;
};

ElasticPowerPriorities32.prototype.setPrioritiesRev = function(priorities) {
    var TSPCommon = require('./TSPCommon'),
        _ = require('underscore');
    var priorities_grouped = TSPCommon._grouper(priorities, this.model.num_neurons);
    priorities_grouped = numeric.transpose(priorities_grouped);
    this.priorities_rev = _.flatten(priorities_grouped, true);
};

ElasticPowerPriorities32.prototype.getPriorities = function(diff) {
    var numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');

    return this.priorities;
};

ElasticPowerPriorities32.prototype.getPrioritiesRev = function(diff) {
    var numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');

    var priorities = this.priorities_rev;
    return this.priorities_rev;
    var dist_2 = _.map(diff, function (value) {
        return Math.sqrt(Math.pow(value[0], 2) + Math.pow(value[1], 2));
    });

    //var dist_2 = _.map(diff, function (value) {
    //    return Math.sqrt(Math.pow(value[0], 2) + Math.pow(value[1], 2));
    //});

    //var dist_3 = TSPCommon._grouper(dist_2, this.model.num_neurons);
    //dist_3 = _.map(dist_3, function(value){
    //   return _.max(value);
    //
    //});
    //
    //dist_2 = numeric.div(dist_2, _.max(dist_2));

    //dist = numeric.mul(priorities, dist_2);
    //dist = numeric.mul(dist, 10);
    //dist = numeric.div(dist, numeric.sum(dist));
    priorities = numeric.mul(priorities, dist_2);
    return priorities;
};

ElasticPowerPriorities32.prototype.weightenDistances = function(diff) {
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');


    var dist = _.map(diff, function (value) {
        return Math.pow(value[0], 2) + Math.pow(value[1], 2);
    });

    // Create [num_items] groups of distances. In each of the group the distances
    // represent distance between group id (item) and neurons.
    var dist_grouped = TSPCommon._grouper(dist, this.model.num_neurons);
    var k = this.model.k;
    if (k < 0.01) {
        k = 0.01;
    }

    var weights = numeric.exp(numeric.div(numeric.neg(dist), (10 * Math.pow(k, 2))));

    var grouped_neurons = TSPCommon._grouper(weights, this.model.num_neurons);
    weights = _.map(grouped_neurons, function (value) {
        return numeric.div(value, numeric.sum(value));
    });

    return weights;
};

ElasticPowerPriorities32.prototype.weightenNeurons = function(diff){
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');

    var dist = this.getPriorities(diff) ? this.getPriorities(diff) : false;
    var dist_grouped = TSPCommon._grouper(dist, this.model.num_neurons);
    return dist_grouped;

    var dist = this.getPriorities(diff) ? this.getPriorities(diff) : false;

    var dist_grouped = TSPCommon._grouper(dist, this.model.num_neurons);
    var k = this.model.k;
    if (k < 0.01) {
        k = 0.01;
    }

    //var weights = numeric.exp(numeric.div(numeric.neg(numeric.pow(dist, 2)), (2 * Math.pow(1 - this.model.k, 2))));
    var weights = numeric.exp(numeric.div(numeric.neg(numeric.pow(dist, 2)), (10 * Math.pow(k, 2))));
    var grouped_neurons = TSPCommon._grouper(weights, this.model.num_neurons);
    weights = _.map(grouped_neurons, function (value) {
        return numeric.div(value, numeric.sum(value));
    });

    return weights;
};

ElasticPowerPriorities32.prototype.weightenNeuronsRev = function(diff){
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');

    var dist = this.getPrioritiesRev(diff) ? this.getPrioritiesRev(diff) : false;
    var dist_grouped = TSPCommon._grouper(dist, this.model.num_neurons);
    return dist_grouped;

    var dist = this.getPrioritiesRev(diff) ? this.getPrioritiesRev(diff) : false;
    var dist_grouped = TSPCommon._grouper(dist, this.model.num_neurons);

    var k = this.model.k;
    if (k < 0.01) {
        k = 0.01;
    }
    //var weights = numeric.exp(numeric.div(numeric.neg(numeric.pow(dist, 2)), (2 * Math.pow(this.model.k, 2))));
    //var weights = numeric.exp(numeric.div(numeric.neg(numeric.pow(dist, 2)), (2 * Math.pow((1-this.model.k), 2))));
    var weights = numeric.exp(numeric.div(numeric.neg(numeric.pow(dist, 2)), (10 * Math.pow(k, 2))));
    var grouped_neurons = TSPCommon._grouper(weights, this.model.num_neurons);
    //grouped_neurons = numeric.transpose(grouped_neurons);
    weights = _.map(grouped_neurons, function (value) {
        return numeric.div(value, numeric.sum(value));
    });
    return weights;

    var weights_2 = _.map(weights, function(group){
        return numeric.div(group, _.max(group));
    });

    return weights_2;
};

ElasticPowerPriorities32.prototype.getNeuronsDelta = function(diff, multiplicator) {
    var numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');

    var weights = this.weightenNeuronsRev(diff);
    //var weights_rev = this.weightenNeuronsRev(diff);
    var weights_dist = numeric.transpose(this.weightenDistances(diff));

    weights = numeric.mul(weights, weights_dist);
    weights = numeric.transpose(weights);
    weights = _.map(weights, function(value){
        var sum = numeric.sum(value);
        value = _.map(value, function(weight){
            return weight /= sum;
        });
        return value;
    });
    weights = numeric.transpose(weights);    //var weights_dist = numeric.transpose(this.weightenDistances(diff));

    var diff_grouped = TSPCommon._grouper(diff, diff.length / this.model.coordinates.length),
        diff_grouped_transposed = numeric.transpose(diff_grouped),
        sum, sum1, sum2, part1, part2, part1_1, part1_2, part1_3, part1_4, j0, j1, j2, delta = [];

    for (j0 = 0; j0 < this.model.neurons.length; j0++) {
        part1_1 = numeric.transpose(diff_grouped_transposed[j0]);
        part1_2 = weights[j0];

        //part1_1 = _.map(part1_1, function(part1_1_value){
        //    return _.map(part1_1_value, function(sub){
        //        return 0.1;
        //    });
        //});
        //console.log(part1_1);

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

module.exports = ElasticPowerPriorities32;
