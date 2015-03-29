/**
 * TSP Result class.
 *
 * @constructor
 */
function TSPResult() {
    this.min = null;
    this.max = null;
    this.min_route = [];
    this.max_route = [];
    this.lower_bound = null;
}

TSPResult.prototype.setMin = function (min) {
    this.min = min;
};

TSPResult.prototype.setMax = function (max) {
    this.max = max;
};

TSPResult.prototype.setMinRoute = function (min_route) {
    this.min_route = min_route;
};

TSPResult.prototype.setMaxRoute = function (max_route) {
    this.max_route = max_route;
};

TSPResult.prototype.setLowerBound = function (lower_bound) {
    this.lower_bound = lower_bound;
};

TSPResult.prototype.export = function () {
    return {
        min: this.min,
        max: this.max,
        min_route: this.min_route,
        max_route: this.max_route,
        lower_bound: this.lower_bound
    };
};

module.exports = TSPResult;
