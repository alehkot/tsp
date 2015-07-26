function TSPLibParserData(data) {
    this.data = data;
    this.dimension = this.setDimension();
    this.valid = this.validate();
    this.edge_weight_type = this.setEdgeWeightType();
    this.edge_weight_format = this.setEdgeWeightFormat();
    this.distances = this.valid ? this.setDistances() : [];
}

TSPLibParserData.prototype.coordsToDistances = function (coords) {
    var math = require('mathjs'),
        _ = require('underscore');

    var combinations = [];
    var items = _.range(coords.length);
    _.each(items, function (value, key, list) {
        _.each(items, function (inner_value, inner_key, list) {
            if (inner_key != key) {
                combinations.push([value, inner_value]);
            }
        });
    });
    var el1, el2, x1, y1, x2, y2;
    var matrix_wrapper = math.zeros(
        coords.length,
        coords.length
    ).map(function (value, index, matrix) {
            if (index[0] !== index[1]) {
                el1 = coords[index[0]];
                el2 = coords[index[1]];
                x1 = el1[0];
                y1 = el1[1];
                x2 = el2[0];
                y2 = el2[1];
                return Math.sqrt(Math.pow(Math.abs(x1 - x2), 2) + Math.pow(Math.abs(y1 - y2), 2));
            } else {
                return 0;
            }
        });

    return matrix_wrapper.toArray();

};

TSPLibParserData.prototype.validate = function () {
    return this.dimension > 0 && this.data.match(new RegExp(/TYPE\s*\:\s*TSP/m)) !== null;
};

TSPLibParserData.prototype.setDimension = function () {
    var matches = this.data.match(new RegExp(/DIMENSION\s*:\s*(\d+)/));
    if (matches != null) {
        return parseInt(matches[1]);
    } else {
        return 0;
    }
};

TSPLibParserData.prototype.setEdgeWeightType = function () {
    var matches = this.data.match(new RegExp(/EDGE_WEIGHT_TYPE\s*:\s*(\w+)/));
    if (matches != null) {
        return matches[1];
    } else {
        return false;
    }
};

TSPLibParserData.prototype.setEdgeWeightFormat = function () {
    var matches = this.data.match(new RegExp(/EDGE_WEIGHT_FORMAT\s*:\s*(\w+)/));
    if (matches != null) {
        return matches[1];
    } else {
        return false;
    }
};

TSPLibParserData.prototype.getDistances = function () {
    return this.distances;
};

TSPLibParserData.prototype.getDimension = function () {
    return this.dimension;
};

TSPLibParserData.prototype.getEdgeWeightType = function () {
    return this.edge_weight_type;
};

TSPLibParserData.prototype.getEdgeWeightFormat = function () {
    return this.edge_weight_format;
};

TSPLibParserData.prototype.setDistances = function () {
    var _ = require('underscore');

    var data_lines = false,
        data_lines_regex = new RegExp(/NODE_COORD_SECTION|EDGE_WEIGHT_SECTION/),
        format = this.getEdgeWeightFormat(),
        type = this.getEdgeWeightType(),
        regex_numbers = new RegExp(/([0123456789.]+)/g),
        matches,
        coordinates = [],
        distances = [],
        that = this,
        builder = new TSPLibMatrixParser(this.getDimension(), format);

    this.data.split(/\r?\n/).forEach(function (line) {
        if (!data_lines) {
            if (line.match(data_lines_regex)) {
                data_lines = true;
            }
        } else {
            if (type == 'EUC_2D') {
                matches = _.toArray(line.match(regex_numbers));
                if (matches.length == 3) {
                    matches.shift();
                    coordinates.push(matches);
                }
            } else if (type == 'EXPLICIT') {
                if (format == 'FULL_MATRIX') {
                    matches = _.toArray(line.match(regex_numbers));
                    if (matches.length == that.getDimension()) {
                        distances.push(matches);
                    }
                } else if (format == 'LOWER_DIAG_ROW') {
                    matches = _.toArray(line.match(regex_numbers));
                    if (matches.length > 0) {
                        builder.setNext(matches);
                    }
                }
            }
        }
    });

    if (true === builder.isUsed()) {
        distances = builder.getMatrix();
    }

    if (coordinates.length > 0) {
        distances = this.coordsToDistances(coordinates);
    }

    _.map(distances, function (val, key) {
        return parseFloat(val);
    });

    return distances;
};

module.exports = TSPLibParserData;
