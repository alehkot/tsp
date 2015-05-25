function ElasticPowerPriorities(model) {
    this.model = model;
}

ElasticPowerPriorities.prototype.setPriorities = function(priorities) {
    this.priorities = priorities;
};

ElasticPowerPriorities.prototype.getPriorities = function() {
    return this.priorities;
};

ElasticPowerPriorities.prototype.setPrioritiesRev = function(priorities) {
    this.priorities_rev = priorities;
};

ElasticPowerPriorities.prototype.getPrioritiesRev = function() {
    var numeric = require('numeric');
    return numeric.mul(this.priorities_rev, 1.01);
    return this.priorities_rev;
};


ElasticPowerPriorities.prototype.weightenNeurons = function(){
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');

    var dist = this.getPriorities() ? this.getPriorities() : false;
    var dist_grouped = TSPCommon._grouper(dist, this.model.num_neurons);
    var k = this.model.k;
    if (k < 0.01) {
        k = 0.01;
    }

    //var weights = numeric.exp(numeric.div(numeric.neg(numeric.pow(dist, 2)), (2 * Math.pow(1 - this.model.k, 2))));
    var weights = numeric.exp(numeric.div(numeric.neg(numeric.pow(dist, 2)), (2 * Math.pow(k, 2))));
    var grouped_neurons = TSPCommon._grouper(weights, this.model.num_neurons);
    weights = _.map(grouped_neurons, function (value) {
        return numeric.div(value, numeric.sum(value));
    });

    return weights;
};

ElasticPowerPriorities.prototype.weightenNeuronsRev = function(){
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');

    var dist = this.getPrioritiesRev() ? this.getPrioritiesRev() : false;
    var dist_grouped = TSPCommon._grouper(dist, this.model.num_neurons);
    dist_grouped = numeric.transpose(dist_grouped);
    dist = _.flatten(dist_grouped, true);

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

ElasticPowerPriorities.prototype.getNeuronsDelta = function(diff, multiplicator) {
    var weights = this.weightenNeurons();
    var weights_rev = this.weightenNeuronsRev();

    var numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');

    var diff_grouped = TSPCommon._grouper(diff, diff.length / this.model.coordinates.length),
        diff_grouped_transposed = numeric.transpose(diff_grouped),
        sum, sum1, sum2, part1, part2, part1_1, part1_2, part1_3, part1_4, j0, j1, j2, delta = [];

    for (j0 = 0; j0 < this.model.neurons.length; j0++) {
        part1_1 = numeric.transpose(diff_grouped_transposed[j0]);
        part1_2 = weights[j0];
        part1_3 = weights_rev[j0];

        part1_2 = numeric.mul(part1_2, part1_2);
        part1_3 = numeric.mul(part1_3, part1_3);

        part1_4 = numeric.mul(part1_2, part1_3);

        var tmp = part1_4;
        tmp = numeric.div(part1_4, numeric.sum(tmp));

        part1 = _.map(part1_1, function (value, key) {
            return numeric.mul(value, part1_4);
        });
        
        part1 = _.map(part1, function (value) {
            return numeric.sum(value);
        });

        sum1 = numeric.mul(part1, multiplicator);
        delta.push(sum1);
    }
    return delta;
};

module.exports = ElasticPowerPriorities;

