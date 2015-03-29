/**
 * Calculates cartesian product of two arrays.
 *
 * @returns {*}
 */
exports._cartesian_product_of = function() {
    var _ = require('underscore');
    return _.reduce(arguments, function (a, b) {
        return _.flatten(_.map(a, function (x) {
            return _.map(b, function (y) {
                return x.concat([y]);
            });
        }), true);
    }, [[]]);
};


/**
 * Calculates the distance between two items.
 *
 * @param value_i
 * @param value_j
 * @returns {number}
 * @private
 */
exports._get_distance = function(value_i, value_j) {
    return Math.sqrt(Math.pow(value_i[0] - value_j[0], 2) + Math.pow(value_i[1] - value_j[1], 2));
};

/**
 * Groups array elements by k.
 *
 * @param array
 * @param k
 * @returns {Array}
 * @private
 */
exports._grouper = function(array, k) {
    var temparray = [];
    for (var i = 0, j = array.length; i < j; i += k) {
        temparray.push(array.slice(i, i + k));
    }
    return temparray;
};

/**
 * Randomly changes elements of model.
 *
 * @param model
 * @param type
 * @private
 */
exports._touch_model = function(model, type) {
    var _ = require('underscore'),
        math = require('mathjs'),
        min = 0,
        max = 1000,
        i = 0,
        j = 0;

    switch (type) {
        case 'move':
        default:
            while (i == j) {
                i = math.randomInt(0, model.length - 1);
                j = math.randomInt(0, model.length - 1);
            }
            model[i][j] = math.randomInt(min, max);
            model[j][i] = model[i][j];
            break;
    }
};

/**
 * Calculates route length for given route and model.
 *
 * @param route
 * @param model
 * @returns {number}
 * @private
 */
exports._calculate_route_length = function(route, model) {
    var i, j, distance = 0;
    for (i = 0, j = route.length; i < j; i++) {
        if (typeof route[i + 1] != 'undefined') {
            distance += parseFloat(model[route[i]][route[i + 1]]);
        }
    }

    return distance;
};

/**
 * Adds distortion to given coordinates or array of coordinates.
 *
 * @param target
 * @returns {*}
 * @private
 */
exports._add_distortion = function(target) {
    function _update_element_position(element) {
        element[0] += _get_distortion();
        element[1] += _get_distortion();
        if (element[0] > 1) {
            element[0] = 0.99;
        } else if (element[0] < 0) {
            element[0] = 0.01;
        }
        if (element[1] > 1) {
            element[1] = 0.99;
        } else if (element[1] < 0) {
            element[1] = 0.01;
        }

        return element;
    }

    var _ = require('underscore');
    function _get_distortion() {
        var value = _.random(1, 10) / 100;
        return _.random(1, 10) <= 5 ? -1 * value : value;
    }
    if (_.isArray(target)) {
        if (!_.isArray(target[0])) {
            target = _update_element_position(target);
        } else {
            console.log(target);
            target = _.map(target, _update_element_position);
            console.log(target);
        }
    }
    return target;
};

/**
 * Returns temporary directory.
 *
 * @returns {string}
 * @private
 */
exports._get_temp_directory = function() {
    var shelljs = require('shelljs/global');
    return tempdir();
}
