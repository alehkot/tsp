/**
 * Elastic Nets TSP solver.
 *
 * @param coordinates
 * @param method_params
 * @param model
 * @param req
 * @constructor
 */
function ElasticNetsMarriage() {
    var TSPResult = require('./TSPResult');
    var ElasticNetsPrinter = require('./ElasticNetsPrinter');
    var TSPCommon = require('./TSPCommon');
    this.method_params = {
        alpha: 1,
        beta: 0.5,
        //num_neurons_factor: 2.5,
        k: 1.0,
        epsilon: 0.02,
        k_num_iter: 25,
        k_alpha: 0.99,
        //radius: 0.1,
        num_iter_max: 10000
    };

    this.priority1 = [
        0.14285714285714, 0.23809523809524, 0.28571428571429, 0.095238095238095, 0.19047619047619, 0.047619047619048,
        0.14285714285714, 0.095238095238095, 0.23809523809524, 0.19047619047619, 0.28571428571429, 0.047619047619048,
        0.28571428571429, 0.23809523809524, 0.095238095238095, 0.14285714285714, 0.19047619047619, 0.047619047619048,
        0.047619047619048, 0.23809523809524, 0.095238095238095, 0.19047619047619, 0.28571428571429, 0.14285714285714,
        0.14285714285714, 0.095238095238095, 0.23809523809524, 0.047619047619048, 0.28571428571429, 0.19047619047619,
        0.19047619047619, 0.095238095238095, 0.23809523809524, 0.14285714285714, 0.28571428571429, 0.047619047619048
    ];

    this.priority2 = [
        0.047619047619048, 0.19047619047619, 0.095238095238095, 0.23809523809524, 0.14285714285714, 0.28571428571429,
        0.23809523809524, 0.28571428571429, 0.19047619047619, 0.14285714285714, 0.095238095238095, 0.047619047619048,
        0.095238095238095, 0.14285714285714, 0.23809523809524, 0.047619047619048, 0.28571428571429, 0.19047619047619,
        0.14285714285714, 0.095238095238095, 0.23809523809524, 0.28571428571429, 0.19047619047619, 0.047619047619048,
        0.14285714285714, 0.095238095238095, 0.047619047619048, 0.19047619047619, 0.23809523809524, 0.28571428571429,
        0.28571428571429, 0.14285714285714, 0.23809523809524, 0.047619047619048, 0.19047619047619, 0.095238095238095
    ];

    this.k = this.method_params.k;
    this.num_items = 6;

    this.priority1_grouped = TSPCommon._grouper(this.priority1, this.num_items);
    this.priority2_grouped = TSPCommon._grouper(this.priority2, this.num_items);

    // Absolute.
    this.items_radius = 400;

    // Relative.
    this.neurons_radius = 0.001;

    this.coordinates = this.model = this.generateModel();
    this.result = new TSPResult();

    this.norm_coordinates_data = this.normalizeCoordinates();
    this.norm_coordinates = this.norm_coordinates_data['norm_coordinates'];
    this.centroid = this.generateCentroid();
    this.num_neurons = this.getNumNeurons();
    this.neurons = this.getNeurons();

    //this.real_distances = this.getRealDistances();
    this.printer = new ElasticNetsPrinter(this.k, this.coordinates, this.norm_coordinates_data);
    this.iteration = 0;

    this.initReversePriorities();
}

/**
 * Moves neurons by specified delta X's and Y's.
 *
 * @param delta
 * @returns {ElasticNetsMarriage}
 */
ElasticNetsMarriage.prototype.moveNeuronsBy = function (delta) {
    var _ = require('underscore'), j0;
    for (j0 = 0; j0 < delta.length; j0++) {
        // Make sure values are float.
        this.neurons[j0] = _.map(this.neurons[j0], function (value) {
            return parseFloat(value);
        });
        delta[j0] = _.map(delta[j0], function (value) {
            return parseFloat(value);
        });

        var candidate = _.map(this.neurons[j0], function (value, key) {
            return value + delta[j0][key];
        });

        if (this.iteration > 4800) {
            var numeric = require('numeric');
            var diff = _.map(this.neurons, function(neuron) {
               return TSPCommon._get_distance(neuron, candidate);
            });
            if (_.filter(diff, function(val) {
                return val < 0.001;
            }).length > 1) {
                this.neurons[j0] = [0.5, 0.5];
            } else {
                // Append deltas.
                this.neurons[j0] = candidate;
            }
        //    var index = _.indexOf(this.neurons, candidate);
        //    if (index)
        } else {
            // Append deltas.
            this.neurons[j0] = candidate;
        }
    }
    return this;
};

/**
 * Runs Elastic Nets algorithm.
 */
ElasticNetsMarriage.prototype.calculate = function() {
    var numeric = require('numeric');
    var TSPCommon = require('./TSPCommon');
    var _  = require('underscore');
    var ElasticPowerPriorities = require('./ElasticPowerPrioritiesTwo');
    var ElasticPowerPrioritiesRev = require('./ElasticPowerPrioritiesRev');
    var ElasticPowerDistance = require('./ElasticPowerDistance');
    var ElasticPowerPriorities31 = require('./ElasticPowerPrioritiesThreeOne');
    var ElasticPowerPriorities32 = require('./ElasticPowerPrioritiesThreeTwo');
    var ElasticPowerPrioritiesFour = require('./ElasticPowerPrioritiesFour');

    //var delta_artificial = [];
    //for (var i = 0; i < this.num_items; i++){
    //    delta_artificial.push([_.random(1, 40) / 100, _.random(1, 40) / 100]);
    //}
    //this.moveNeuronsBy(delta_artificial);

    // Print the first page.
    this.printer.addPage(this.neurons, this.k, 0);

    var weightening_result, weights, worst_dist, diff;

    var power4 = new ElasticPowerPriorities31(this);
    power4.setPriorities(this.priority1);
    power4.setPrioritiesRev(this.priority2);

    var power5 = new ElasticPowerPriorities32(this);
    power5.setPriorities(this.priority1);
    power5.setPrioritiesRev(this.priority2);
    //power5.setPrioritiesRev(this.priority2_grouped_reverse);


    //var power1 = new ElasticPowerPriorities(this);
    //power1.setPriorities(this.priority1);
    //power1.setPrioritiesRev(this.priority2);
    //var power3 = new ElasticPowerDistance(this);
    this.orig_priority1_grouped = TSPCommon._clone_array(this.priority1_grouped);
    this.orig_priority2_grouped = TSPCommon._clone_array(this.priority2_grouped);

    //var result = [ [ 3, 1 ], [ 2, 2 ], [ 1,3 ], [ 5, 5 ], [ 4, 6 ], [6, 4] ];
    //console.log(this.checkResult(result));
    //return;
    //power4.priorities_grouped = this.priority1_grouped;
    //power5.priorities_rev_grouped = this.priority2_grouped;
    var t = 1000;

    for (this.iteration = 1; this.iteration <= this.method_params.num_iter_max; this.iteration++) {
        //console.log(this.iteration);

        if (this.iteration > 9950 && t > 0) {
            console.log('t:', t);
            t--;
            var pairs = this.findPairsRev().result;
            //console.log(pairs);
            if (pairs.length == this.num_items) {
                console.log(pairs);
                var that = this;
                //var better_alternatives = this.weightenBetterAlternatives();
                var global_found = false;
                var failed_pairs = this.checkResult(pairs);
                console.log(failed_pairs);
                if (failed_pairs.length) {
                    for (var k = 0; k < failed_pairs.length; k++) {
                        var pair = failed_pairs[k];
                        //var i = pair.i;
                        //var j = pair.better_j;

                        //var i = pair.better_j_pair[0];
                        //var j = pair.better_j_pair[1];
                        //that.priority1_grouped[i][j] *= 0.99;
                        //that.priority2_grouped[j][i] *= 0.99;
                        //that.priority1_grouped_reverse[i][j] /= 0.99;
                        //that.priority2_grouped_reverse[j][i] /= 0.99;
                        var i = pair['i'];
                        var j = pair['j'];
                        console.log('modifying 1:', i, j);
                        that.priority1_grouped[i][j] *= 0.9;
                        that.priority2_grouped[j][i] *= 0.9;
                        that.priority1_grouped_reverse[i][j] /= 0.9;
                        that.priority2_grouped_reverse[j][i] /= 0.9;

                        console.log('new values 1:', that.priority1_grouped[i][j], that.priority2_grouped[j][i]);

                        i = pair.better_j_pair[0];
                        j = pair.better_j_pair[1];
                        console.log('modifying 2:', i, j);
                        that.priority1_grouped[i][j] *= 0.9;
                        that.priority2_grouped[j][i] *= 0.9;
                        that.priority1_grouped_reverse[i][j] /= 0.9;
                        that.priority2_grouped_reverse[j][i] /= 0.9;

                        console.log('new values 2:', that.priority1_grouped[i][j], that.priority2_grouped[j][i]);


                        power4.priorities_grouped = that.priority1_grouped;
                        power5.priorities_rev_grouped = numeric.transpose(that.priority2_grouped);

                        that.k = 1.0;
                        that.iteration = 1;
                        that.neurons = that.getNeurons();

                    }
                } else {
                    console.log('win');
                }
                continue;
            }
        }


        //if (this.iteration > 9900 && pairs.length == this.num_items) {
        //    var that = this;
        //    var better_alternatives = this.weightenBetterAlternatives();
        //    var global_found = false;
        //    _.each(better_alternatives, function(value_i, i) {
        //        var found = false;
        //        _.each(value_i, function (value_j, j) {
        //            if (value_j > (1.0 / Math.exp(1))) {
        //                that.priority1_grouped[i][j] *= 0.99;
        //                that.priority2_grouped[j][i] *= 0.99;
        //                that.priority1_grouped_reverse[i][j] /= 0.99;
        //                that.priority2_grouped_reverse[j][i] /= 0.99;
        //
        //                power4.priorities_grouped = that.priority1_grouped;
        //                power5.priorities_rev_grouped = that.priority2_grouped;
        //
        //                that.k = 1.0;
        //                that.iteration = 1;
        //                that.neurons = that.getNeurons();
        //                console.log('modify:', i + 1, j + 1);
        //
        //                global_found = true;
        //            }
        //        });
        //    });

        //    if (global_found) {
        //        continue;
        //    }
        //}

        //var pairs = this.findPairs().result;
        ////console.log(pairs);
        //if (this.iteration > 9000 && pairs.length == this.num_items) {
        //
        //    var that = this;
        //    var better_alternatives = this.weightenBetterAlternatives();
        //    var global_found = false;
        //    _.each(better_alternatives, function(value_i, i) {
        //        var found = false;
        //        _.each(value_i, function(value_j, j) {
        //            if (value_j > (1.0 / Math.exp(1))) {
        //                found = true;
        //                global_found = true;
        //            }
        //        });
        //        if (found) {
        //            _.each(value_i, function(value_j, j) {
        //                if (Math.abs(value_j - (1.0 / Math.exp(1))) < 0.001) {
        //                    that.priority1_grouped[i][j] *= 0.99;
        //                    that.priority2_grouped[j][i] *= 0.99;
        //                    that.priority1_grouped_reverse[i][j] /= 0.99;
        //                    that.priority2_grouped_reverse[j][i] /= 0.99;
        //
        //                    power4.priorities_grouped = that.priority1_grouped;
        //                    power5.priorities_rev_grouped = that.priority2_grouped;
        //
        //                    that.k = 1.0;
        //                    that.iteration = 1;
        //                    that.neurons = that.getNeurons();
        //                }
        //            });
        //        }
        //    });
        //
        //    if (!global_found) {
        //        this.iteration = this.method_params.num_iter_max;
        //    }
        //}

        // Update K?
        if (this.iteration % this.method_params.k_num_iter == 0) {
            //method_params.k_num_iter = _.random(1, 50);

            this.k *= this.method_params.k_alpha;

            //if (this.k < 0.0281) {
            //    this.k = 0.0281;
            //}
            if (this.k < 0.01) {
                this.k = 0.01;
            }
            // Print each iteration state.
            //_output_image(ctx, coordinates, neurons, norm_coordinates_data, k, iteration);
            this.printer.addPage(this.neurons, this.k, this.iteration);
        }

        if (this.iteration >= this.method_params.num_iterations_max) {
            break;
        }
        diff = this.getDiff();

        //var delta1 = power1.getNeuronsDelta(diff, 0.003*Math.exp(-0.2 / (2 * Math.pow(this.k, 2))));
        //var delta2 = power2.getNeuronsDelta(diff, 0.003*Math.exp(-0.2 / (2 * Math.pow(1-this.k, 2))));
        //var delta1 = power1.getNeuronsDelta(diff, 0.4 * this.k);
        //var delta3 = power3.getNeuronsDelta(diff, 0.01 + 0.01*Math.exp(-0.2 / (2 * Math.pow(1 - this.k, 2))));
        //var delta2 = power2.getNeuronsDelta(diff, this.k);
        //this.k = 0.02;
        //var delta4 = power4.getNeuronsDelta(diff, 0.00002);

        //var u = 0.009 / this.k;
        //if (u > 0.4) {
        //    u = 0.4;
        //}
        //var delta3 = power3.getNeuronsDelta(diff, u);


        // Three one
        //var delta1 = power1.getNeuronsDelta(diff, 0.08);
        //var delta3 = power3.getNeuronsDelta(diff, 0.2);

        var delta4 = power4.getNeuronsDelta(diff, 0.1);
        var delta5 = power5.getNeuronsDelta(diff, 0.1);
        //var total_delta_x = numeric.sum(_.pluck(delta4, 0)) + numeric.sum(_.pluck(delta5, 0));
        //var total_delta_y = numeric.sum(_.pluck(delta4, 1)) + numeric.sum(_.pluck(delta5, 1));
        //if (total_delta_x < 0.00001 && total_delta_y < 0.00001) {
        //    this.k *= this.method_params.k_alpha;
        //}

        //var delta6 = power6.getNeuronsDelta(diff, 2);

        if (this.k < 0.16) {
            //var old_k = this.k;
            //this.k = 0.2;
            //delta3 = power3.getNeuronsDelta(diff, 0.02);
            //this.k = old_k;
        }
        if (this.k > 0.18) {
            //var delta1 = power1.getNeuronsDelta(diff, this.k);
            //this.moveNeuronsBy(delta1);
        } else {
            //var old_k = this.k;
            //this.k = 0.2;
            //delta3 = power3.getNeuronsDelta(diff, 0.02);
            //this.k = old_k;
            //this.moveNeuronsBy(delta3);
        }
        //this.moveNeuronsBy(delta3);
        //this.moveNeuronsBy(delta1);
        //this.moveNeuronsBy(delta6);
        this.moveNeuronsBy(delta4);
        this.moveNeuronsBy(delta5);

        //this.moveNeuronsBy(delta2);
    }

    var pairs_data = this.findPairsRev();
    var result = pairs_data.result;
    var result_index_i = pairs_data.index_i;
    var result_index_j = pairs_data.index_j;

    // Randomize this.
    //result = [];
    //var a = _.range(0, this.num_items);
    //var b = _.shuffle(_.range(0, this.num_items));
    //result_index_i = [];
    //result_index_j = [];
    //_.each(a, function(val, i){
    //    result_index_i[i] = b[i];
    //    result_index_j[b[i]] = i;
    //});
    //
    //_.each(result_index_i, function(j, i){
    //    result.push([i + 1, j + 1]);
    //});


    //// Reverse priorities
    //var weights_order = priority1_grouped[0];
    //weights_order = _.sortBy(weights_order, function(val){ return val; });
    //var weights_order_rev = _.clone(weights_order);
    //weights_order_rev = weights_order_rev.reverse();
    //
    //var priority1_grouped_norm = _.clone(priority1_grouped);
    //priority1_grouped_norm = _.map(priority1_grouped_norm, function(value_i, i){
    //   return _.map(value_i, function(value_j, j){
    //       return weights_order_rev[_.indexOf(weights_order, value_j)];
    //   });
    //});
    //
    //var priority2_grouped_norm = _.clone(priority2_grouped);
    //priority2_grouped_norm = _.map(priority2_grouped_norm, function(value_i, i){
    //    return _.map(value_i, function(value_j, j){
    //        return weights_order_rev[_.indexOf(weights_order, value_j)];
    //    });
    //});
    //
    //var reconnecting = true;
    //var num_tries = 10;
    //while(reconnecting && num_tries--) {
    //    console.log('New cycle');
    //    reconnecting = false;
    //
    //    var priority1_grouped_proc = _.map(priority1_grouped_norm, function(value_i, i) {
    //
    //        // result_index_i[i] => j in pair
    //        var internal_k = priority1_grouped_norm[i][result_index_i[i]];
    //
    //        return _.map(value_i, function(value_j, j){
    //            return Math.exp(-1 * Math.pow(value_j, 2) / (2 * Math.pow(internal_k, 2)));
    //        });
    //    });
    //
    //    var priority2_grouped_proc = _.map(priority2_grouped_norm, function(value_i, i) {
    //
    //        // result_index_i[i] => j in pair
    //        var internal_k = priority2_grouped_norm[i][result_index_j[i]];
    //
    //        return _.map(value_i, function(value_j, j){
    //            return Math.exp(-1 * Math.pow(value_j, 2) / (2 * Math.pow(internal_k, 2)));
    //        });
    //    });
    //    priority2_grouped_proc = numeric.transpose(priority2_grouped_proc);
    //
    //    var proc_result = numeric.mul(priority1_grouped_proc, priority2_grouped_proc);
    //
    //    var max = -1;
    //    var max_ij = [];
    //    _.each(proc_result, function(value_i, i){
    //        var max = -1;
    //        var max_j = -1;
    //        _.each(value_i, function(value_j, j){
    //            if (value_j > (1 / Math.exp(1))) {
    //                if (value_j > max) {
    //                    max = value_j;
    //                    max_j = j;
    //                }
    //            }
    //        });
    //
    //        if (max > 0) {
    //            j = max_j;
    //            console.log('Should connect:', i + 1, j + 1);
    //            var old_j = result_index_i[i];
    //            var old_i = result_index_j[j];
    //            console.log('Breaking pairs', i + 1, old_j + 1, 'and', old_i + 1, j + 1);
    //            result_index_i[i] = j;
    //            result_index_j[j] = i;
    //            console.log('Connecting', i + 1, j + 1);
    //            result_index_i[old_i] = old_j;
    //            result_index_j[old_j] = old_i;
    //            console.log('Reconnecting', old_i + 1, old_j + 1);
    //            reconnecting = true;
    //        }
    //    });
    //    //_.each(proc_result, function(value_i, i) {
    //    //    _.each(value_i, function(value_j, j) {
    //    //        if (value_j > (1 / Math.exp(1))) {
    //    //            if (value_j > max) {
    //    //                max = value_j;
    //    //                max_ij = [i, j];
    //    //            }
    //    //        }
    //    //    });
    //    //});
    //    //if (max > 0) {
    //    //    var i = max_ij[0];
    //    //    var j = max_ij[1];
    //    //    console.log('Should connect:', i + 1, j + 1);
    //    //    var old_j = result_index_i[i];
    //    //    var old_i = result_index_j[j];
    //    //    console.log('Breaking pairs', i + 1, old_j + 1, 'and', old_i + 1, j + 1);
    //    //    result_index_i[i] = j;
    //    //    result_index_j[j] = i;
    //    //    console.log('Connecting', i + 1, j + 1);
    //    //    result_index_i[old_i] = old_j;
    //    //    result_index_j[old_j] = old_i;
    //    //    console.log('Reconnecting', old_i + 1, old_j + 1);
    //    //    reconnecting = true;
    //    //}
    //    console.log('Remaining tries: ', num_tries);
    //}
    //
    //result = [];
    //_.each(result_index_i, function(j, i){
    //   result.push([i + 1, j + 1]);
    //});
    console.log('New pairs: ', result);

    //this.weightenBetterAlternatives();
    if (result.length == this.num_items) {
        console.log(this.checkResult(result));
    } else {
        console.log('Epic fail');
    }


    //var assigned = [], pairs = [];
    //// Foreach item.
    //for (var i = 0; i < this.norm_coordinates.length; i++) {
    //    var min_distance = 99999;
    //    var j_min_distance = -1;
    //    for (var j = 0; j < this.neurons.length; j++) {
    //        var distance = TSPCommon._get_distance(this.norm_coordinates[i], this.neurons[j])
    //        if (distance < min_distance && !_.contains(assigned, j)) {
    //            j_min_distance = j;
    //            min_distance = distance;
    //        }
    //    }
    //    assigned.push(j_min_distance);
    //    pairs.push([i, j_min_distance]);
    //}
    //
    //pairs = _.sortBy(pairs, function (pair) {
    //    return pair[1];
    //});
};

ElasticNetsMarriage.prototype.initReversePriorities = function() {
    var _ = require('underscore');
    var TSPCommon = require('./TSPCommon');
    var priority1_grouped = this.priority1_grouped;
    var priority2_grouped = this.priority2_grouped;

    // Reverse priorities
    var weights_order = priority1_grouped[0];
    weights_order = _.sortBy(weights_order, function(val){ return val; });
    var weights_order_rev = _.clone(weights_order);
    weights_order_rev = weights_order_rev.reverse();

    var priority1_grouped_norm = TSPCommon._clone_array(priority1_grouped);
    priority1_grouped_norm = _.map(priority1_grouped_norm, function(value_i, i){
        return _.map(value_i, function(value_j, j) {
            var index = _.indexOf(weights_order, value_j);
            if (index != -1) {
                return weights_order_rev[index];
            } else {
                return 1.0;
            }
        });
    });

    var priority2_grouped_norm = TSPCommon._clone_array(priority2_grouped);
    priority2_grouped_norm = _.map(priority2_grouped_norm, function(value_i, i){
        return _.map(value_i, function(value_j, j) {
            var index = _.indexOf(weights_order, value_j);
            if (index != -1) {
                return weights_order_rev[index];
            } else {
                return 1.0;
            }
        });
    });
    this.priority1_grouped_reverse = priority1_grouped_norm;
    this.priority2_grouped_reverse = priority2_grouped_norm;

    //this.priority1_grouped[3][3] = 0.01;
    //this.priority2_grouped[3][3] = 0.01;
    //this.priority1_grouped_reverse[3][3] = 0.99;
    //this.priority2_grouped_reverse[3][3] = 0.99;

};

/**
 * Tries to weighten alternatives.
 */
ElasticNetsMarriage.prototype.weightenBetterAlternatives = function() {
    if (this.iteration == 66296 || this.iteration == 66297) {
        console.log('here');
    }
    var _ = require('underscore');
    var numeric = require('numeric');
    var priority1 = this.priority1;
    var priority2 = this.priority2;
    var priority1_grouped = this.priority1_grouped;
    var priority2_grouped = this.priority2_grouped;
    var pairs = this.findPairs();
    var pairs_rev = this.findPairsRev();
    var result = pairs.result;
    var result_index_i = pairs_rev.index_i;
    var result_index_j = pairs.index_j;

    var priority1_grouped_norm = this.priority1_grouped_reverse;
    var priority2_grouped_norm = this.priority2_grouped_reverse;

    var priority1_grouped_proc = _.map(priority1_grouped_norm, function(value_i, i) {

        // result_index_i[i] => j in pair
        var internal_k = priority1_grouped_norm[i][result_index_i[i]];

        return _.map(value_i, function(value_j, j){
            return Math.exp(-1 * Math.pow(value_j, 2) / (2 * Math.pow(internal_k, 2)));
        });
    });

    var priority2_grouped_proc = _.map(priority2_grouped_norm, function(value_i, i) {

        // result_index_i[i] => j in pair
        var internal_k = priority2_grouped_norm[i][result_index_j[i]];

        return _.map(value_i, function(value_j, j){
            return Math.exp(-1 * Math.pow(value_j, 2) / (2 * Math.pow(internal_k, 2)));
        });
    });
    priority2_grouped_proc = numeric.transpose(priority2_grouped_proc);

    var proc_result = numeric.mul(priority1_grouped_proc, priority2_grouped_proc);
    return proc_result;
};

/**
 * Check if result is a correct solution.
 *
 * @param result
 * @param priority1_grouped
 * @param priority2_grouped
 */
ElasticNetsMarriage.prototype.checkResult = function(result) {
    var priority1_grouped = this.orig_priority1_grouped;
    var priority2_grouped = this.orig_priority2_grouped;
    var _ = require('underscore');
    var failed_pairs = [];
    _.each(result, function(pair){
        console.log('looking: ', pair);
        var i = pair[0] - 1;
        var j = pair[1] - 1;
        var ij_weight = priority1_grouped[i][j];
        var ji_weight = priority2_grouped[j][i];
        _.each(priority1_grouped[i], function(i_val, i_pos) {
            if (i_val > ij_weight) {
                console.log(i + 1, 'wants', i_pos + 1, 'more');

                var i_pos_j = _.find(result, function(result_data) {
                    return (result_data[1] - 1) == i_pos;
                });
                console.log('found pair:', i_pos_j);

                // tekuchasya para vtorogo chuvoka
                var el_current_pair = priority2_grouped[i_pos_j[1] - 1][i_pos_j[0] - 1];
                console.log('current weight of this pair', el_current_pair);
                console.log('weight of alternative pair', priority2_grouped[i_pos_j[1] - 1][i]);

                if (el_current_pair < priority2_grouped[i_pos_j[1] - 1][i]) {
                    failed_pairs.push({
                        'i': i,
                        'j': j,
                        'better_j': i_pos,
                        'better_j_pair': [i_pos_j[0] - 1, i_pos_j[1] - 1]
                    });
                    console.log('fail');
                }
            }
        });
    });
    return failed_pairs;
};

/**
 * Find pairs based on minimal distances.
 *
 * @returns {Array}
 */
ElasticNetsMarriage.prototype.findPairs = function() {
    var _ = require('underscore');
    var distances = this.getRealDistances();
    var result = [];
    var result_index_i = [];
    var result_index_j = [];
    var assigned = [];
    _.each(distances, function(value_1, i){
        var min_distance = 99999;
        var min_j = -1;
        _.each(value_1, function(value_2, j){
            if (value_2 < min_distance) {
                min_distance = value_2;
                min_j = j;
            }
        });
        if (!_.contains(assigned, min_j)) {
            result.push([min_j + 1, i + 1]);
            result_index_i[min_j] = i;
            result_index_j[i] = min_j;
            assigned.push(min_j);
        }
    });
    return {
        'index_i': result_index_i,
        'index_j': result_index_j,
        'result': result
    };
};

/**
 * Find pairs based on minimal distances.
 *
 * @returns {Array}
 */
ElasticNetsMarriage.prototype.findPairsRev = function() {
    var _ = require('underscore');
    var numeric = require('numeric');
    var distances = numeric.transpose(this.getRealDistances());
    var result = [];
    var result_index_i = [];
    var result_index_j = [];
    var assigned = [];
    _.each(distances, function(value_1, i){
        var min_distance = 99999;
        var min_j = -1;
        _.each(value_1, function(value_2, j){
            if (value_2 < min_distance && !_.contains(assigned, j)) {
                min_distance = value_2;
                min_j = j;
            }
        });
        // if (!_.contains(assigned, min_j)
        result.push([i + 1, min_j + 1]);
        result_index_i[i] = min_j;
        result_index_j[min_j] = i;
        assigned.push(min_j);
    });
    return {
        'index_i': result_index_i,
        'index_j': result_index_j,
        'result': result
    };
};

/**
 * Calculates distances between each of the items and each of the neurons.
 *
 * @returns {Array}
 */
ElasticNetsMarriage.prototype.getDiff = function() {
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');

    var cp_coordinates_neurons = TSPCommon._cartesian_product_of(this.norm_coordinates, this.neurons);
    var diff = _.map(cp_coordinates_neurons, function (value) {
        return numeric.sub(value[0], value[1]);
    });
    return diff;
};

/**
 * Returns solution according to the current position of neurons.
 *
 * @returns {*}
 */
ElasticNetsMarriage.prototype.buildSolution = function() {
    // Output pdf file.
    // @todo Use aspects.
    this.printer.printPages();
    return this.result.export();
};

/**
 * Returns real distances between neurons and items.
 *
 * @returns {*}
 */
ElasticNetsMarriage.prototype.getRealDistances = function() {
    var numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');
    var coordinates = this.norm_coordinates;
    var neurons = this.neurons;
    var distances = numeric.rep([coordinates.length, coordinates.length], 0);
    _.each(coordinates, function (value_i, i) {
        _.each(neurons, function (value_j, j) {
            distances[i][j] = TSPCommon._get_distance(value_i, value_j);
        });
    });
    return distances;
};

/**
 * Generates specified number of neurons on a centroid.
 * They are distributed uniformly.
 *
 * @returns {*}
 */
ElasticNetsMarriage.prototype.getNeurons = function() {
    var numeric = require('numeric'),
        _ = require('underscore');
    var that = this;
    var items = _.map(this.norm_coordinates, function(value){
       return [that.centroid[0], that.centroid[1]];
    });
    return items;

    var theta = [];
    var linspace_max = 2 * Math.PI;
    for (var i = 0; i < this.num_neurons; i++) {
        theta.push(linspace_max * i / this.num_neurons);
    }

    var xpos = numeric.mul(this.neurons_radius, numeric.cos(theta));
    var ypos = numeric.mul(this.neurons_radius, numeric.sin(theta));

    xpos = numeric.addeq(xpos, this.centroid[0]);
    ypos = numeric.addeq(ypos, this.centroid[1]);

    return _.zip(xpos, ypos);
};

/**
 * Returns number of neurons.
 *
 * @returns {Number}
 */
ElasticNetsMarriage.prototype.getNumNeurons = function() {
    return this.coordinates.length;
};

/**
 * Generates centroid.
 *
 * @returns {*[]}
 */
ElasticNetsMarriage.prototype.generateCentroid = function() {
    var _ = require('underscore'),
        math = require('mathjs');

    return [0.5, 0.5];

    var reduced_matrix = _.reduce(this.norm_coordinates, function (memo, value) {
        return [memo[0] + value[0], memo[1] + value[1]];
    });

    return [reduced_matrix[0] / this.norm_coordinates.length, reduced_matrix[1] / this.norm_coordinates.length];
};

/**
 * Normalizes coordinates.
 *
 * @returns {{norm_coordinates: *, min_width: *, min_height: *, max_width: *, max_height: *}}
 */
ElasticNetsMarriage.prototype.normalizeCoordinates = function() {
    var _ = require('underscore');

    var min_width = 0;
    var max_width = 1000;
    var min_height = 0;
    var max_height = 1000;
    var norm_coordinates = _.map(this.coordinates, function (value) {
        return [(value[0] - min_width) / (max_width - min_width), (value[1] - min_height) / (max_height - min_height)];
    });

    return {
        'norm_coordinates': norm_coordinates,
        'min_width': min_width,
        'min_height': min_height,
        'max_width': max_width,
        'max_height': max_height
    };
};

/**
 * Generates Model.
 *
 * @returns {*}
 */
ElasticNetsMarriage.prototype.generateModel = function() {
    var numeric = require('numeric'),
        _ = require('underscore');
    //var items = [];
    //var step = 200 / this.num_items;
    //for (var i = 0; i < this.num_items; i++) {
    //    items.push([400, 200 + i * step]);
    //}
    //return items;

    //var items = [];
    //for (var i = 0; i < this.num_items; i++) {
    //    items.push([100 + _.random(300), 100 + _.random(300)]);
    //}
    //return items;

    var theta = [];
    var linspace_max = 2.0 * Math.PI;
    //var linspace_max = Math.PI / 8;
    for (var i = 0; i < this.num_items; i++) {
        //theta.push(linspace_max * i / this.num_items + 0.001 * _.random(1, 500));
        theta.push(linspace_max * i / this.num_items);
    }

    //theta = _.shuffle(theta);

    var xpos = numeric.mul(this.items_radius, numeric.cos(theta));
    var ypos = numeric.mul(this.items_radius, numeric.sin(theta));

    xpos = numeric.addeq(xpos, 500);
    ypos = numeric.addeq(ypos, 500);

    return _.zip(xpos, ypos);
};

module.exports = ElasticNetsMarriage;
