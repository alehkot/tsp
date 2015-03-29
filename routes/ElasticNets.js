/**
 * Elastic Nets TSP solver.
 *
 * @param coordinates
 * @param method_params
 * @param model
 * @param req
 * @constructor
 */
function ElasticNets(coordinates, method_params, model, req) {
    var TSPResult = require('./TSPResult');
    var ElasticNetsPrinter = require('./ElasticNetsPrinter');
    var TSPCommon = require('./TSPCommon');
    // @todo Remove.
    this.req = req;
    this.model = model;
    this.method_params = method_params;
    this.k = this.method_params.k;

    // @todo Check if bug.
    this.coordinates = coordinates;

    this.result = new TSPResult();
    this.norm_coordinates_data = this.normalizeCoordinates();
    this.norm_coordinates = this.norm_coordinates_data['norm_coordinates'];
    this.centroid = this.generateCentroid();
    this.num_neurons = this.getNumNeurons();
    this.neurons = this.getNeurons();
    this.real_distances = this.getRealDistances();
    this.printer = new ElasticNetsPrinter(this.k, coordinates, this.norm_coordinates_data);
    this.iteration = 0;
}

/**
 * Weightens neurons.
 *
 * @returns {{weights: *, worst_dist: number, diff: *}}
 */
ElasticNets.prototype.weightenNeurons = function() {
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');


    // Calculates distances between each of the items and each of the neurons.
    var cp_coordinates_neurons = TSPCommon._cartesian_product_of(this.norm_coordinates, this.neurons);
    var diff = _.map(cp_coordinates_neurons, function (value) {
        return numeric.sub(value[0], value[1]);
    });

    var dist = _.map(diff, function (value) {
        return Math.pow(value[0], 2) + Math.pow(value[1], 2);
    });

    // Create [num_items] groups of distances. In each of the group the distances
    // represent distance between group id (item) and neurons.
    var dist_grouped = TSPCommon._grouper(dist, this.num_neurons);
    var worst_dist = Math.sqrt(_.reduce(dist_grouped, function (memo, value) {
        var min = _.min(value);
        return min > memo ? min : memo;
    }, 0));

    // exp(-d^2 / 2k^2)
    var weights = numeric.exp(numeric.div(numeric.neg(dist), (2 * Math.pow(this.k, 2))));
    var grouped_neurons = TSPCommon._grouper(weights, this.num_neurons);

    weights = _.map(grouped_neurons, function (value) {
        return numeric.div(value, numeric.sum(value));
    });

    return {
        weights: weights,
        worst_dist: worst_dist,
        diff: diff
    };
};

ElasticNets.prototype.updateNeurons = function(diff, weights) {
    var numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');
    var diff_grouped = TSPCommon._grouper(diff, diff.length / this.coordinates.length),
        diff_grouped_transposed = numeric.transpose(diff_grouped),
        weights_transposed = numeric.transpose(weights),
        sum, sum1, sum2, part1, part2, part1_1, part1_2, j0, j1, j2, delta = [];

    //if (this.k < 0.1 && this.method_params.beta == 2) {
    //    console.log('activated');
    //    method_params.beta = 4.5;
    //}

    for (j0 = 0; j0 < this.neurons.length; j0++) {
        //if (this.method_params.beta == 10) {
        //    console.log('activated');
        //}
        j1 = (j0 + 1) % this.neurons.length;
        j2 = (j0 - 1) % this.neurons.length;
        if (j1 < 0) {
            j1 = this.neurons.length - j1;
        }
        if (j2 < 0) {
            // + because minus on minus.
            j2 = this.neurons.length + j2;
        }

        part1_1 = numeric.transpose(diff_grouped_transposed[j0]);
        part1_2 = weights_transposed[j0];
        //part1 = numeric.mul(part1, part2);
        part1 = _.map(part1_1, function (value, key) {
            return numeric.mul(value, part1_2);
        });
        part1 = _.map(part1, function (value) {
            return numeric.sum(value);
        });

        part2 = numeric.add(numeric.sub(this.neurons[j1], numeric.mul(this.neurons[j0], 2)), this.neurons[j2]);

        sum1 = numeric.mul(part1, this.method_params.alpha);
        sum2 = numeric.mul(part2, this.method_params.beta * this.k);
        sum = numeric.add(sum1, sum2);
        delta.push(sum);
    }

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
};

/**
 * Runs Elastic Nets algorithm.
 */
ElasticNets.prototype.calculate = function() {
    // Print the first page.
    this.printer.addPage(this.neurons, this.k, 0);

    var weightening_result, weights, worst_dist, diff;

    for (this.iteration = 1; this.iteration <= this.method_params.num_iter_max; this.iteration++) {
        console.log(this.iteration);

        // Update K?
        if (this.iteration % this.method_params.k_num_iter == 0) {
            //method_params.k_num_iter = _.random(1, 50);
            this.k *= this.method_params.k_alpha;
            if (this.k < 0.01) {
                this.k = 0.01;
            }

            // Print each iteration state.
            //_output_image(ctx, coordinates, neurons, norm_coordinates_data, k, iteration);
            this.printer.addPage(this.neurons, this.k, this.iteration);
        }

        weightening_result = this.weightenNeurons();
        weights = weightening_result.weights;
        worst_dist = weightening_result.worst_dist;
        diff = weightening_result.diff;

        if (worst_dist < this.method_params.epsilon || this.iteration >= this.method_params.num_iterations_max) {
            break;
        }

        this.updateNeurons(diff, weights);
    }
};

/**
 * Returns solution according to the current position of neurons.
 *
 * @returns {*}
 */
ElasticNets.prototype.buildSolution = function() {
    var _ = require('underscore'),
        numeric = require('numeric'),
        TSPCommon = require('./TSPCommon');

    var assigned = [], pairs = [];
    // Foreach item.
    for (var i = 0; i < this.norm_coordinates.length; i++) {
        var min_distance = 99999;
        var j_min_distance = -1;
        for (var j = 0; j < this.neurons.length; j++) {
            var distance = TSPCommon._get_distance(this.norm_coordinates[i], this.neurons[j])
            if (distance < min_distance && !_.contains(assigned, j)) {
                j_min_distance = j;
                min_distance = distance;
            }
        }
        assigned.push(j_min_distance);
        pairs.push([i, j_min_distance]);
    }

    pairs = _.sortBy(pairs, function (pair) {
        return pair[1];
    });

    var visited = _.pluck(pairs, 0);

    // Make the loop.
    visited.push(visited[0]);

    this.result.setMinRoute(visited);

    //result.setMin(-1);

    this.result.setMin(TSPCommon._calculate_route_length(visited, this.model));

    // Output pdf file.
    // @todo Use aspects.
    this.printer.printPages();

    // Save neurons position.
    if (!this.method_params.reoptimize) {
        // @todo Get rid of req.
        this.req.session.neurons = this.neurons;
    }

    return this.result.export();
};

/**
 * Returns real distances between items.
 *
 * @returns {*}
 */
ElasticNets.prototype.getRealDistances = function() {
    var numeric = require('numeric'),
        _ = require('underscore'),
        TSPCommon = require('./TSPCommon');
    var coordinates = this.coordinates;
    var distances = numeric.rep([coordinates.length, coordinates.length], 0);
    _.each(coordinates, function (value_i, i) {
        _.each(coordinates, function (value_j, j) {
            if (i != j) {
                distances[i][j] = TSPCommon._get_distance(value_i, value_j);
            }
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
ElasticNets.prototype.getNeurons = function() {
    if (this.method_params.reoptimize && this.req.session && this.req.session.neurons) {
        var TSPCommon = require('./TSPCommon');
        console.log('Reoptimizing...');
        var neurons = TSPCommon._add_distortion(this.req.session.neurons);
        return neurons;
    }
    var numeric = require('numeric'),
        _ = require('underscore');

    //var theta = numeric.linspace(0, 2 * Math.PI, num_neurons);
    var theta = [];
    var linspace_max = 2 * Math.PI;
    for (var i = 0; i < this.num_neurons; i++) {
        theta.push(linspace_max * i / this.num_neurons);
    }

    var xpos = numeric.mul(this.method_params.radius, numeric.cos(theta));
    var ypos = numeric.mul(this.method_params.radius, numeric.sin(theta));

    xpos = numeric.addeq(xpos, this.centroid[0]);
    ypos = numeric.addeq(ypos, this.centroid[1]);

    return _.zip(xpos, ypos);
};

/**
 * Returns number of neurons.
 *
 * @returns {Number}
 */
ElasticNets.prototype.getNumNeurons = function() {
    return parseInt(this.coordinates.length * this.method_params.num_neurons_factor);
};

/**
 * Generates centroid.
 *
 * @returns {*[]}
 */
ElasticNets.prototype.generateCentroid = function() {
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
ElasticNets.prototype.normalizeCoordinates = function() {
    var _ = require('underscore');

    var min_width = _.min(_.pluck(this.coordinates, 0));
    var max_width = _.max(_.pluck(this.coordinates, 0));
    var min_height = _.min(_.pluck(this.coordinates, 1));
    var max_height = _.max(_.pluck(this.coordinates, 1));
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

module.exports = ElasticNets;
