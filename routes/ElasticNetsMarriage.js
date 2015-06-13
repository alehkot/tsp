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

    this.k = this.method_params.k;
    this.num_items = 5;

    // Absolute.
    this.items_radius = 200;

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
}

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
    var linspace_max = 2 * Math.PI;
    for (var i = 0; i < this.num_items; i++) {
        //theta.push(linspace_max * i / this.num_items + 0.001 * _.random(1, 500));
        theta.push(linspace_max * i / this.num_items);
    }

    //theta = _.shuffle(theta);

    var xpos = numeric.mul(this.items_radius, numeric.cos(theta));
    var ypos = numeric.mul(this.items_radius, numeric.sin(theta));

    xpos = numeric.addeq(xpos, 250);
    ypos = numeric.addeq(ypos, 250);

    return _.zip(xpos, ypos);
};

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

        // Append deltas.
        this.neurons[j0] = _.map(this.neurons[j0], function (value, key) {
            return value + delta[j0][key];
        });
    }
    return this;
};

/**
 * Runs Elastic Nets algorithm.
 */
ElasticNetsMarriage.prototype.calculate = function() {
    var numeric = require('numeric');
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

    var priority1 = [
        0.33333333333333, 0.066666666666667, 0.26666666666667, 0.13333333333333, 0.2,
        0.26666666666667, 0.066666666666667, 0.2, 0.349, 0.13333333333333,
        0.13333333333333, 0.2, 0.33333333333333, 0.26666666666667, 0.066666666666667,
        0.069999993, 0.26666666666667, 0.13333333333333, 0.33333333333333, 0.2,
        0.2, 0.26666666666667, 0.066666666666667, 0.13333333333333, 0.33333333333333
    ];

    var priority2 = [
        0.13333333333333, 0.33333333333333, 0.066666666666667, 0.28, 0.2,
        0.26666666666667, 0.2, 0.066666666666667, 0.13333333333333, 0.33333333333333,
        0.33333333333333, 0.066666666666667, 0.13333333333333, 0.2, 0.26666666666667,
        0.13333333333333, 0.28, 0.066666666666667, 0.2, 0.33333333333333,
        0.066666666666667, 0.13333333333333, 0.33333333333333, 0.26666666666667, 0.2
    ];

    var power1 = new ElasticPowerPriorities(this);
    power1.setPriorities(priority1);

    power1.setPrioritiesRev(priority2);

    var power4 = new ElasticPowerPriorities31(this);
    power4.setPriorities(priority1);

    power4.setPrioritiesRev(priority2);

    var power5 = new ElasticPowerPriorities32(this);
    power5.setPriorities(priority1);

    power5.setPrioritiesRev(priority2);

    var power6 = new ElasticPowerPrioritiesFour(this);
    power6.setPriorities(priority1);

    power6.setPrioritiesRev(priority2);

    //power1.setPriorities([
    //    0.2, 0.4, 0.6, 0.8, 1.0,
    //    0.2, 0.6, 0.4, 1.0, 0.8,
    //    0.6, 0.4, 1.0, 0.8, 0.2,
    //    0.6, 0.2, 0.4, 1.0, 0.8,
    //    0.4, 0.2, 0.6, 0.8, 1.0
    //]);

    var power2 = new ElasticPowerPrioritiesRev(this);
    //power2.setPriorities([
    //    0.2, 0.4, 0.6, 0.8, 1.0,
    //    1.0, 0.6, 0.2, 0.8, 0.4,
    //    0.6, 0.4, 1.0, 0.2, 0.8,
    //    0.8, 1.0, 0.2, 0.6, 0.4,
    //    1.0, 0.8, 0.6, 0.2, 0.4
    //]);
    power2.setPriorities([
        0.2, 0.4, 0.6, 0.8, 1.0,
        0.6, 0.4, 0.2, 0.8, 1.0,
        0.6, 0.4, 1.0, 0.2, 0.8,
        0.8, 0.4, 0.2, 0.6, 1.0,
        1.0, 0.8, 0.6, 0.2, 0.4
    ]);

    var power3 = new ElasticPowerDistance(this);

    for (this.iteration = 1; this.iteration <= this.method_params.num_iter_max; this.iteration++) {
        console.log(this.iteration);

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

        var delta4 = power4.getNeuronsDelta(diff, 0.2);
        var delta5 = power5.getNeuronsDelta(diff, 0.2);
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

    var distances = this.getRealDistances();
    var result = [];
    _.each(distances, function(value_1, i){
        var min_distance = 99999;
        var min_j = -1;
        _.each(value_1, function(value_2, j){
            if (value_2 < min_distance) {
                min_distance = value_2;
                min_j = j;
            }
        });
        result.push([min_j + 1, i + 1]);
    });

    var TSPCommon = require('./TSPCommon');
    var priority1_grouped = TSPCommon._grouper(priority1, this.num_items);
    var priority2_grouped = TSPCommon._grouper(priority2, this.num_items);

    console.log(result);

    _.each(result, function(pair){
        console.log('looking: ', pair);
        var i = pair[0] - 1;
        var j = pair[1] - 1;
        var ij_weight = priority1_grouped[i][j];
        var ji_weight = priority2_grouped[j][i];
        _.each(priority1_grouped[i], function(i_val, i_pos){
            if (i_val > ij_weight) {
                console.log(i + 1, 'wants', i_pos + 1, 'more');

                var i_pos_j = _.find(result, function(result_data){
                    return (result_data[1] - 1) == i_pos;
                });
                console.log('found pair:', i_pos_j);

                // tekuchasya para vtorogo chuvoka
                var el_current_pair = priority2_grouped[i_pos_j[1] - 1][i_pos_j[0] - 1];
                console.log('current weight of this pair', el_current_pair);
                console.log('weight of alternative pair', priority2_grouped[i_pos_j[1] - 1][i]);

                if (el_current_pair < priority2_grouped[i_pos_j[1] - 1][i]) {
                    console.log('fail');
                }
            }
        });
    });

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
    var max_width = 500;
    var min_height = 0;
    var max_height = 500;
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

module.exports = ElasticNetsMarriage;
