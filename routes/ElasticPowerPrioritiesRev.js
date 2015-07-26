function ElasticPowerPrioritiesRev(model) {
    this.model = model;
}

ElasticPowerPrioritiesRev.prototype.setPriorities = function(priorities) {
    this.priorities = priorities;
};

ElasticPowerPrioritiesRev.prototype.getPriorities = function() {
    return this.priorities;
};

ElasticPowerPrioritiesRev.prototype.weightenNeurons = function(){
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');

    var dist = this.getPriorities() ? this.getPriorities() : false;
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

ElasticPowerPrioritiesRev.prototype.getNeuronsDelta = function(diff, multiplicator) {
    weights = this.weightenNeurons();

    var numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');

    var diff_grouped = TSPCommon._grouper(diff, diff.length / this.model.coordinates.length),
        diff_grouped_transposed = numeric.transpose(diff_grouped),
        sum, sum1, sum2, part1, part2, part1_1, part1_2, j0, j1, j2, delta = [];

    // @aspect
    // Generate -1 matrix to substract diffs.
    //var neg_one_matrix = new Array(diff_grouped_transposed[0].length);
    //for (var i = 0; i < diff_grouped_transposed[0].length; i++) {
    //    neg_one_matrix[i] = new Array(diff_grouped_transposed[0][0].length);
    //    for (var j = 0; j < diff_grouped_transposed[0][0].length; j++) {
    //        neg_one_matrix[i][j] = -1;
    //    }
    //}
    //neg_one_matrix = numeric.transpose(neg_one_matrix);

    for (j0 = 0; j0 < this.model.neurons.length; j0++) {
        part1_1 = numeric.transpose(diff_grouped_transposed[j0]);
        part1_2 = weights[j0];

        part1 = _.map(part1_1, function (value, key) {
            //// @aspect
            //var max = _.reduce(value, function (memo, sub_value) {
            //    return Math.abs(sub_value) > memo ? Math.abs(sub_value) : memo;
            //}, 0);
            //
            //value = _.map(value, function(sub_value){
            //    return sub_value < 0 ? -1 * max - sub_value : max - sub_value;
            //});

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

module.exports = ElasticPowerPrioritiesRev;
