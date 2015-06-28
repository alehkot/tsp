var _super = require('./ElasticPowerPrioritiesThree').prototype,
    method = ElasticPowerPriorities32.prototype = Object.create( _super);

method.constructor = ElasticPowerPriorities32;

/**
 * Reverse Elastic Nets Power.
 *
 * @param model
 * @constructor
 */
function ElasticPowerPriorities32(model, priorities) {
    _super.constructor.apply(this, arguments);
    this.setPriorities(priorities);
}
/**
 * Calculates delta.
 *
 * @param diff
 * @param multiplicator
 * @returns {Array}
 */
method.getNeuronsDelta = function(diff, multiplicator) {
    return _super.getNeuronsDelta.call(this, diff, multiplicator);
};

/**
 * Sets the priorities.
 *
 * @param priorities
 */
method.setPriorities = function(priorities) {
    var TSPCommon = require('./TSPCommon'),
        _ = require('underscore');

    if (typeof priorities[0] != 'object') {
        priorities = TSPCommon._grouper(priorities, this.model.num_items);
    }

    this.priorities_rev_grouped = numeric.transpose(priorities);
    this.priorities_rev = _.flatten(this.priorities_rev_grouped, true);
};

/**
 * Return priorities.
 *
 * @returns {*}
 */
method.getPriorities = function() {
    return this.priorities_rev_grouped;
};

module.exports = ElasticPowerPriorities32;
