/**
 * Elastic Nets TSP solver.
 *
 * @param coordinates
 * @param method_params
 * @param model
 * @param req
 * @constructor
 */
function ElasticNetsAP() {
    var TSPResult = require('./TSPResult'),
        ElasticNetsPrinter = require('./ElasticNetsPrinter'),
        TSPCommon = require('./TSPCommon'),
        ElasticPowerPriorities31 = require('./ElasticPowerPrioritiesAP'),
        _ = require('underscore');

    this.method_params = {
        alpha: 0.1,
        beta: 0.1,
        k: 1.0,
        epsilon: 0.001,
        epsilon_check_iter: 4800,
        k_num_iter: 25,
        k_alpha: 0.99,
        gamma: 0.9,
        num_max_relaxations: 1000,
        check_relaxation_iter_min: 99950,
        max_width: 1000,
        max_height: 1000,
        items_radius: 400,
        num_iter_max: 10000,
        priority1: [
            7, 28, 42, 9, 65, 80, 65, 55, 38, 17,
            68, 56, 62, 22, 93, 61, 75, 65, 25, 99,
            99, 33, 46, 19, 30, 34, 87, 23, 20, 89,
            60, 58, 12, 44, 97, 55, 28, 54, 41, 68,
            90, 8, 95, 60, 77, 95, 28, 32, 79, 58,
            50, 12, 44, 55, 58, 79, 41, 38, 16, 31,
            13, 47, 70, 64, 52, 57, 71, 26, 18, 51,
            94, 43, 66, 76, 54, 18, 70, 64, 84, 80,
            53, 63, 44, 95, 79, 59, 54, 28, 77, 42,
            98, 56, 63, 59, 30, 75, 51, 50, 14, 68
            //9, 49, 12, 87, 64, 34, 17, 46, 69, 70,
            //58, 4, 46, 21, 92, 59, 84, 34, 3, 88,
            //26, 91, 63, 79, 67, 31, 19, 78, 49, 45,
            //18, 89, 15, 67, 57, 45, 19, 63, 97, 45,
            //58, 87, 5, 61, 27, 72, 73, 8, 77, 96,
            //84, 57, 53, 32, 2, 73, 78, 24, 96, 45,
            //41, 10, 32, 7, 66, 48, 49, 22, 28, 71,
            //62, 93, 96, 2, 33, 19, 40, 70, 12, 94,
            //5, 14, 50, 79, 48, 69, 68, 36, 34, 57,
            //36, 3, 6, 55, 16, 64, 8, 92, 96, 7
        ],
        num_items: 10
    };

    this.k_alpha = this.method_params.k_alpha;
    this.num_items = this.method_params.num_items;
    this.num_max_relaxations = this.method_params.num_max_relaxations;
    this.num_iter_max = this.method_params.num_iter_max;
    this.check_relaxation_iter_min = this.method_params.check_relaxation_iter_min;
    this.priority1 = _.clone(this.method_params.priority1);
    this.priority1_vanilla_grouped = TSPCommon._grouper(this.method_params.priority1, this.num_items);

    this.preprocessPriority1();

    this.alpha = this.method_params.alpha;
    this.beta = this.method_params.beta;
    this.max_width = this.method_params.max_width;
    this.max_height = this.method_params.max_height;
    this.k = this.method_params.k;
    this.num_items = this.method_params.num_items;
    this.gamma = this.method_params.gamma;
    this.epsilon = this.method_params.epsilon;
    this.epsilon_check_iter = this.method_params.epsilon_check_iter;
    this.items_radius = this.method_params.items_radius;

    this.priority1_grouped = TSPCommon._grouper(this.priority1, this.num_items);
    this.orig_priority1_grouped = TSPCommon._clone_array(this.priority1_grouped);

    this.coordinates = this.model = this.generateModel();
    this.norm_coordinates_data = this.normalizeCoordinates();
    this.norm_coordinates = this.norm_coordinates_data['norm_coordinates'];
    this.centroid = this.generateCentroid();
    this.num_neurons = this.getNumNeurons();
    this.neurons = this.getNeurons();

    this.printer = new ElasticNetsPrinter(this.k, this.coordinates, this.norm_coordinates_data);
    this.iteration = 0;

    this.power1 = new ElasticPowerPriorities31(this, this.priority1);

    this.initReversePriorities();
    this.result = new TSPResult();

    // Print the first page.
    this.printer.addPage(this.neurons, this.k, 0);
}

ElasticNetsAP.prototype.preprocessPriority1 = function() {
    var numeric = require('numeric'),
        _ = require('underscore');

    //this.priority1 = numeric.sub(100, this.priority1);
    ///this.priority1 = numeric.div(this.priority1, numeric.sum(this.priority1));
    this.priority1 = numeric.div(this.priority1, 100);
};

/**
 * Runs Elastic Nets algorithm.
 */
ElasticNetsAP.prototype.calculate = function() {
    var numeric = require('numeric'),
        TSPCommon = require('./TSPCommon'),
        _  = require('underscore'),
        weightening_result, weights, worst_dist, diff, delta1, delta2, result,
        power1 = this.power1,
        power2 = this.power2;

    this.num_max_relaxations = this.method_params.num_max_relaxations;
    this.check_relaxation_iter_min = this.method_params.check_relaxation_iter_min;
    var t = this.num_max_relaxations;

    for (this.iteration = 1; this.iteration <= this.method_params.num_iter_max; this.iteration++) {
        //if (this.iteration > this.check_relaxation_iter_min && t-- > 0) {
        //
        //    console.log('Remaining relaxations:', t);
        //
        //    if (this.processPrelimenaryResult()) {
        //        continue;
        //    }
        //}

        // Update K?
        if (this.iteration % this.method_params.k_num_iter == 0) {

            this.k *= this.k_alpha;

            if (this.k < 0.01) {
                this.k = 0.01;
            }

            // Print page.
            this.printer.addPage(this.neurons, this.k, this.iteration);
        }

        if (this.iteration >= this.num_iter_max) {
            break;
        }

        diff = this.getDiff();

        this.moveNeuronsBy(power1.getNeuronsDelta(diff, this.alpha));
    }

    result = this.findPairsRev().result;

    while (true) {
        console.log('New reoptimization cycle.');
        var check_result = this.checkResult(result);
        if (!check_result.length) {
            break;
        } else {
            var curr_pair_index = check_result[0]['current_pair_index'];
            var better_j_pair_index = check_result[0]['better_j_pair_index'];

            result[curr_pair_index][1] = check_result[0]['better_j'] + 1;
            result[better_j_pair_index][1] = check_result[0]['j'] + 1;
        }
    }


    console.log('Final result:', result);
    console.log('Sum:', this.calcResultSum(result));
};

/**
 * Calculates sum of given route.
 *
 * @param result
 * @returns {number}
 */
ElasticNetsAP.prototype.calcResultSum = function(result) {
    var sum = 0,
        that = this,
        _ = require('underscore');

    _.each(result, function(pair) {
        sum += that.priority1_vanilla_grouped[pair[0] - 1][pair[1] - 1];
    });
    return sum;
};

/**
 * Reverses items weights to be used in some use cases.
 */
ElasticNetsAP.prototype.initReversePriorities = function() {
    var _ = require('underscore');
    var TSPCommon = require('./TSPCommon');
    var priority1_grouped = this.priority1_grouped;

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

    this.priority1_grouped_reverse = priority1_grouped_norm;
    return this;
};

/**
 * Find pairs based on minimal distances.
 *
 * @returns {Array}
 */
ElasticNetsAP.prototype.findPairs = function() {
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
 * Associates each of neurons with the closest item.
 *
 * @returns {Array}
 */
ElasticNetsAP.prototype.findPairsRev = function() {
    var _ = require('underscore'),
        numeric = require('numeric'),
        // Each neuron should be associated.
        distances = numeric.transpose(this.getRealDistances()),
        result = [],
        result_index_i = [],
        result_index_j = [],
        assigned = [];

    _.each(distances, function(value_1, i) {
        var min_distance = 99999;
        var min_j = -1;
        _.each(value_1, function(value_2, j) {
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
ElasticNetsAP.prototype.getDiff = function() {
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
ElasticNetsAP.prototype.buildSolution = function() {
    // Output pdf file.
    this.printer.printPages();
    return this.result.export();
};

/**
 * Returns real distances between neurons and items.
 *
 * @returns {*}
 */
ElasticNetsAP.prototype.getRealDistances = function() {
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
ElasticNetsAP.prototype.getNeurons = function() {
    var numeric = require('numeric'),
        _ = require('underscore');
    var that = this;
    var items = _.map(this.norm_coordinates, function(value){
       return [that.centroid[0], that.centroid[1]];
    });
    return items;
};

/**
 * Returns number of neurons.
 *
 * @returns {Number}
 */
ElasticNetsAP.prototype.getNumNeurons = function() {
    return this.coordinates.length;
};

/**
 * Generates centroid.
 *
 * @returns {*[]}
 */
ElasticNetsAP.prototype.generateCentroid = function() {
    var _ = require('underscore'),
        math = require('mathjs');

    // The coordinates has been already normalized.
    return [0.5, 0.5];
};

/**
 * Normalizes coordinates.
 *
 * @returns {{norm_coordinates: *, min_width: *, min_height: *, max_width: *, max_height: *}}
 */
ElasticNetsAP.prototype.normalizeCoordinates = function() {
    var _ = require('underscore');

    var min_width = 0;
    var max_width = this.max_width;
    var min_height = 0;
    var max_height = this.max_height;

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
ElasticNetsAP.prototype.generateModel = function() {
    var numeric = require('numeric'),
        _ = require('underscore');

    var theta = [];
    var linspace_max = 2.0 * Math.PI;
    for (var i = 0; i < this.num_items; i++) {
        theta.push(linspace_max * i / this.num_items);
    }

    var xpos = numeric.mul(this.items_radius, numeric.cos(theta));
    var ypos = numeric.mul(this.items_radius, numeric.sin(theta));

    // Center.
    xpos = numeric.addeq(xpos, this.max_width / 2);
    ypos = numeric.addeq(ypos, this.max_height / 2);

    return _.zip(xpos, ypos);
};

/**
 * Moves neurons by specified delta X's and Y's.
 *
 * @param delta
 * @returns {ElasticNetsMarriage}
 */
ElasticNetsAP.prototype.moveNeuronsBy = function (delta) {
    var _ = require('underscore'),
        TSPCommon = require('./TSPCommon'),
        numeric = require('numeric'),
        j0, diff, candidate;

    for (j0 = 0; j0 < delta.length; j0++) {

        // Potential coordinates if everything is fine.
        candidate = _.map(this.neurons[j0], function (value, key) {
            return value + delta[j0][key];
        });

        if (this.iteration > this.epsilon_check_iter) {
            numeric = require('numeric');
            var that = this;
            diff = _.map(this.neurons, function (neuron) {
                return TSPCommon._get_distance(neuron, candidate);
            });

            // If > 1 neurons are very close to each other, it's an invalid case.
            if (_.filter(diff, function(val) {
                    return val < that.epsilon;
                }).length > 1) {
                // Move neuron to the center.
                this.neurons[j0] = this.generateCentroid();
            } else {
                // Append deltas.
                this.neurons[j0] = candidate;
            }
        } else {
            // Append deltas.
            this.neurons[j0] = candidate;
        }
    }
    return this;
};

/**
 * Resets the algorithm
 */
ElasticNetsAP.prototype.resetAlgorithm = function() {
    this.k = this.method_params.k;
    this.iteration = 1;
    this.neurons = this.getNeurons();
};

/**
 * Processes a solution.
 *
 * Checks if a solution solves the marriage problem.
 * Triggers priorities' modifications, if not.
 *
 * @returns {boolean}
 */
ElasticNetsAP.prototype.processPrelimenaryResult = function(power1, power2) {
    var pairs = this.findPairsRev().result;
    console.log('Sum:', this.calcResultSum(pairs));
    if (pairs.length == this.num_items) {
        console.log('Current result:', pairs);
        var that = this;
        var global_found = false;
        var failed_pairs = this.checkResult(pairs);

        if (failed_pairs.length) {
            console.log('Failed pairs:', failed_pairs);
            for (var k = 0; k < failed_pairs.length; k++) {
                var pair = failed_pairs[k];
                this.relaxPriorities(pair, power1, power2);
            }
        }
        return true;
    }
    return false;
};

/**
 * Check if result is a correct solution.
 *
 * @param result
 * @param priority1_grouped
 * @param priority2_grouped
 */
ElasticNetsAP.prototype.checkResult = function(result) {
    var priority1_grouped = this.orig_priority1_grouped;
    var priority2_grouped = this.orig_priority1_grouped;
    var _ = require('underscore');
    var failed_pairs = [];
    var TSPCommon = require('./TSPCommon');
    var orig_sum = this.calcResultSum(result);
    var that = this;
    var new_result;
    var candidates = _.range(0, this.num_items);
    var failed_pair_candidate;

    _.each(result, function(pair, pair_i) {
        //console.log('looking: ', pair);
        var i = pair[0] - 1;
        var j = pair[1] - 1;

        _.each(candidates, function (candidate) {
            if (candidate != j) {
                //console.log('Checking alternative pair', i, candidate);
                new_result = TSPCommon._clone_array(result);

                var candidate_i = _.findIndex(result, function (result_data) {
                    return (result_data[1] - 1) == candidate;
                });

                //console.log('Found old candidate pair:', candidate_i, candidate);

                new_result[pair_i][1] = candidate + 1;
                new_result[candidate_i][1] = j + 1;
                var new_sum = that.calcResultSum(new_result);
                if (new_sum > orig_sum) {
                    console.log(new_sum);
                    failed_pair_candidate = {
                        'i': i,
                        'j': j,
                        'current_pair_index': pair_i,
                        'better_j_pair_index': candidate_i,
                        'better_j': candidate,
                        'better_j_pair': [result[candidate_i][0] - 1, candidate]
                    };
                    //failed_pairs.push(failed_pair_candidate);
                    orig_sum = new_sum;
                }
            }
        });
    });
    if (failed_pair_candidate) {
        failed_pairs.push(failed_pair_candidate);
    }
    return failed_pairs;
};

/**
 * Updates the priorities based on a failed pair information.
 *
 * @param pair_data
 * @param power1
 * @param power2
 */
ElasticNetsAP.prototype.relaxPriorities = function(pair_data, power1, power2) {
    var numeric = require('numeric'), i,j ;

    i = pair_data['i'];
    j = pair_data['j'];
    //console.log('Modifying:', i, j);
    this.relaxPair(i, j);
    //console.log('New priorities:', this.priority1_grouped[i][j], this.priority1_grouped[j][i]);

    i = pair_data.better_j_pair[0];
    j = pair_data.better_j_pair[1];
    //console.log('Modifying:', i, j);
    this.relaxPair(i, j);
    //console.log('New priorities:', this.priority1_grouped[i][j], this.priority1_grouped[j][i]);

    this.power1.priorities_grouped = this.priority1_grouped;

    this.resetAlgorithm();
};

/**
 * Relaxes the pair.
 *
 * @param i
 * @param j
 */
ElasticNetsAP.prototype.relaxPair = function(i, j) {
    this.priority1_grouped[i][j] *= this.gamma;
    this.priority1_grouped_reverse[i][j] /= this.gamma;
};

module.exports = ElasticNetsAP;
