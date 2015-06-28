var _super = require('./ElasticPowerPrioritiesThree').prototype,
    method = ElasticPowerPriorities31.prototype = Object.create( _super);

method.constructor = ElasticPowerPriorities31;

/**
 * Elastic Nets Power.
 *
 * @param model
 * @constructor
 */
function ElasticPowerPriorities31(model, priorities) {
    _super.constructor.apply(this, arguments);
    this.setPriorities(priorities);
}

/**
 * Sets the priorities.
 *
 * @param priorities
 */
method.setPriorities = function(priorities) {
    var TSPCommon = require('./TSPCommon');
    this.priorities = priorities;
    this.priorities_grouped = TSPCommon._grouper(priorities, this.model.num_neurons);
};

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
 * Returns grouped priorities.
 *
 * @returns {Array|*}
 */
method.getPriorities = function() {
    return this.priorities_grouped;
};

module.exports = ElasticPowerPriorities31;
