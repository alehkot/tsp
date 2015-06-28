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
    var TSPResult = require('./TSPResult'),
        ElasticNetsPrinter = require('./ElasticNetsPrinter'),
        TSPCommon = require('./TSPCommon'),
        ElasticPowerPriorities31 = require('./ElasticPowerPrioritiesThreeOne'),
        ElasticPowerPriorities32 = require('./ElasticPowerPrioritiesThreeTwo');

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
        check_relaxation_iter_min: 9950,
        max_width: 1000,
        max_height: 1000,
        items_radius: 400,
        num_iter_max: 10000,
        priority1: [
            0.14285714285714, 0.23809523809524, 0.28571428571429, 0.095238095238095, 0.19047619047619, 0.047619047619048,
            0.14285714285714, 0.095238095238095, 0.23809523809524, 0.19047619047619, 0.28571428571429, 0.047619047619048,
            0.28571428571429, 0.23809523809524, 0.095238095238095, 0.14285714285714, 0.19047619047619, 0.047619047619048,
            0.047619047619048, 0.23809523809524, 0.095238095238095, 0.19047619047619, 0.28571428571429, 0.14285714285714,
            0.14285714285714, 0.095238095238095, 0.23809523809524, 0.047619047619048, 0.28571428571429, 0.19047619047619,
            0.19047619047619, 0.095238095238095, 0.23809523809524, 0.14285714285714, 0.28571428571429, 0.047619047619048
        ],
        priority2: [
            0.047619047619048, 0.19047619047619, 0.095238095238095, 0.23809523809524, 0.14285714285714, 0.28571428571429,
            0.23809523809524, 0.28571428571429, 0.19047619047619, 0.14285714285714, 0.095238095238095, 0.047619047619048,
            0.095238095238095, 0.14285714285714, 0.23809523809524, 0.047619047619048, 0.28571428571429, 0.19047619047619,
            0.14285714285714, 0.095238095238095, 0.23809523809524, 0.28571428571429, 0.19047619047619, 0.047619047619048,
            0.14285714285714, 0.095238095238095, 0.047619047619048, 0.19047619047619, 0.23809523809524, 0.28571428571429,
            0.28571428571429, 0.14285714285714, 0.23809523809524, 0.047619047619048, 0.19047619047619, 0.095238095238095
        ],
        num_items: 6
    };

    this.k_alpha = this.method_params.k_alpha;
    this.num_items = this.method_params.num_items;
    this.num_max_relaxations = this.method_params.num_max_relaxations;
    this.num_iter_max = this.method_params.num_iter_max;
    this.check_relaxation_iter_min = this.method_params.check_relaxation_iter_min;
    this.priority1 = this.method_params.priority1;
    this.priority2 = this.method_params.priority2;
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
    this.priority2_grouped = TSPCommon._grouper(this.priority2, this.num_items);
    this.orig_priority1_grouped = TSPCommon._clone_array(this.priority1_grouped);
    this.orig_priority2_grouped = TSPCommon._clone_array(this.priority2_grouped);

    this.coordinates = this.model = this.generateModel();
    this.norm_coordinates_data = this.normalizeCoordinates();
    this.norm_coordinates = this.norm_coordinates_data['norm_coordinates'];
    this.centroid = this.generateCentroid();
    this.num_neurons = this.getNumNeurons();
    this.neurons = this.getNeurons();

    this.printer = new ElasticNetsPrinter(this.k, this.coordinates, this.norm_coordinates_data);
    this.iteration = 0;

    this.power1 = new ElasticPowerPriorities31(this, this.priority1);
    this.power2 = new ElasticPowerPriorities32(this, this.priority2);

    this.initReversePriorities();
    this.result = new TSPResult();

    // Print the first page.
    this.printer.addPage(this.neurons, this.k, 0);
}

/**
 * Runs Elastic Nets algorithm.
 */
ElasticNetsMarriage.prototype.calculate = function() {
    var numeric = require('numeric'),
        TSPCommon = require('./TSPCommon'),
        _  = require('underscore'),
        weightening_result, weights, worst_dist, diff, delta1, delta2, result,
        power1 = this.power1,
        power2 = this.power2,
        t = this.num_max_relaxations;

    this.num_max_relaxations = this.method_params.num_max_relaxations;
    this.check_relaxation_iter_min = this.method_params.check_relaxation_iter_min;

    for (this.iteration = 1; this.iteration <= this.method_params.num_iter_max; this.iteration++) {
        if (this.iteration > this.check_relaxation_iter_min && t-- > 0) {

            console.log('Remaining relaxations:', t);

            if (this.processPrelimenaryResult()) {
                continue;
            }
        }

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
        this.moveNeuronsBy(power2.getNeuronsDelta(diff, this.beta));
    }

    result = this.findPairsRev().result;
    console.log('Final result: ', result);
    if (result.length == this.num_items) {
        console.log(this.checkResult(result));
    } else {
        console.log('Can\'t match pairs');
    }

};

/**
 * Reverses items weights to be used in some use cases.
 */
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
    return this;
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

    // The coordinates has been already normalized.
    return [0.5, 0.5];
};

/**
 * Normalizes coordinates.
 *
 * @returns {{norm_coordinates: *, min_width: *, min_height: *, max_width: *, max_height: *}}
 */
ElasticNetsMarriage.prototype.normalizeCoordinates = function() {
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
ElasticNetsMarriage.prototype.generateModel = function() {
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
ElasticNetsMarriage.prototype.moveNeuronsBy = function (delta) {
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
 * Relaxes the pair.
 *
 * @param i
 * @param j
 */
ElasticNetsMarriage.prototype.relaxPair = function(i, j) {
    this.priority1_grouped[i][j] *= this.gamma;
    this.priority2_grouped[j][i] *= this.gamma;
    this.priority1_grouped_reverse[i][j] /= this.gamma;
    this.priority2_grouped_reverse[j][i] /= this.gamma;
};

/**
 * Updates the priorities based on a failed pair information.
 *
 * @param pair_data
 * @param power1
 * @param power2
 */
ElasticNetsMarriage.prototype.relaxPriorities = function(pair_data, power1, power2) {
    var numeric = require('numeric'), i,j ;

    i = pair_data['i'];
    j = pair_data['j'];
    console.log('Modifying:', i, j);
    this.relaxPair(i, j);
    console.log('New priorities:', this.priority1_grouped[i][j], this.priority2_grouped[j][i]);

    i = pair_data.better_j_pair[0];
    j = pair_data.better_j_pair[1];
    console.log('Modifying:', i, j);
    this.relaxPair(i, j);
    console.log('New priorities:', this.priority1_grouped[i][j], this.priority2_grouped[j][i]);

    this.power1.priorities_grouped = this.priority1_grouped;
    this.power2.priorities_rev_grouped = numeric.transpose(this.priority2_grouped);

    this.resetAlgorithm();
};

/**
 * Resets the algorithm
 */
ElasticNetsMarriage.prototype.resetAlgorithm = function() {
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
ElasticNetsMarriage.prototype.processPrelimenaryResult = function(power1, power2) {
    var pairs = this.findPairsRev().result;
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

module.exports = ElasticNetsMarriage;
