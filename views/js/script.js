(function () {
    var underscore = angular.module('underscore', []);
    underscore.factory('_', function () {
        return window._; // assumes underscore has already been loaded on the page
    });

    var app = angular.module('tsp', ['underscore']);

    app.config(['$httpProvider',
        function ($httpProvider) {
            $httpProvider.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';
        }
    ]);

    app.controller('TSPController', function ($scope) {
    });

    app.service('TSPModel', ['$log',
        function ($log) {
            return {
                number_of_items: 1,
                render: false,
                matrix: [],
                coordinates: [],
                reset: function () {
                    this.number_of_items = 1;
                    this.matrix = [];
                }
            };
        }
    ]);

    app.service('TSPGenerator', ['$log',
        function ($log) {
            return {
                min: 1,
                max: 1000,
                symmetric: true
            };
        }
    ]);

    app.service('TSPSolution', [
        '$log',
        '$rootScope',
        function ($log, $rootScope) {
            return {
                min: null,
                max: null,
                min_route: null,
                max_route: null,
                lower_bound: null,
                setMin: function (min) {
                    this.min = min;
                },
                setMax: function (max) {
                    this.max = max;
                },
                setMinRoute: function (min_route) {
                    this.min_route = min_route;
                },
                setMaxRoute: function (max_route) {
                    this.max_route = max_route;
                },
                getMinRoute: function () {
                    return this.min_route;
                },
                notify: function () {
                    $rootScope.$broadcast('solution:updated', this);
                }
            };
        }
    ]);

    app.filter('implode', function () {
        return function (input) {
            return input.join(', ');
        }
    });

    app.controller('TSPParserController', ['$scope', 'TSPModel', 'fileUpload',
        function ($scope, TSPModel, fileUpload) {
            this.parse = function () {
                var file = $scope.tsplibFile;
                console.log('file is ' + JSON.stringify(file));
                var uploadUrl = "/api/parse";
                fileUpload.uploadFileToUrl(file, uploadUrl, function (data) {
                    if (data.items) {
                        TSPModel.matrix = data.items;
                        TSPModel.number_of_items = data.items.length;
                    }
                });
            };
        }
    ]);

    app.controller('TSPModelViewController', ['$scope', 'TSPModel', 'TSPGenerator',
        function ($scope, TSPModel, TSPGenerator) {
            this.tsp_model = TSPModel;
            this.generator = TSPGenerator;
        }
    ]);

    app.controller('TSPSolverController', ['$scope', '$http', '$location', 'TSPModel', 'TSPSolution',
        function ($scope, $http, $location, TSPModel, TSPSolution) {
            this.reoptimize = function () {
                var that = this;
                $http.post('http://' + $location.host() + ':3000/api/reoptimize', {
                    model: that.tsp_model.matrix,
                    num_iterations: that.num_iterations,
                    num_items: that.tsp_model.number_of_items,
                    result: that.result
                }).then(function (result) {

                });
            }

            /*
             * Executes POST request to the server to find the optimal route.
             */
            this.calculate = function () {
                var that = this;
                this.result = {};

                var request_object = {
                    model: that.tsp_model.matrix,
                    num_iterations: that.num_iterations,
                    num_items: that.tsp_model.number_of_items,
                    method: that.method.name,
                    method_params: that.method_params,
                    coordinates: that.tsp_model.coordinates
                };

                $http.post('http://' + $location.host() + ':3000/api/calculate', request_object).then(function (result) {
                    that.result.min = result.data.min;
                    that.result.max = result.data.max;
                    that.result.min_route = result.data.min_route;
                    that.result.max_route = result.data.max_route;
                    that.result.lower_bound = result.data.lower_bound;
                    $scope.tsp_solution.setMax(result.data.max);
                    $scope.tsp_solution.setMin(result.data.min);
                    $scope.tsp_solution.setMinRoute(result.data.min_route);
                    $scope.tsp_solution.setMaxRoute(result.data.max_route);
                    $scope.tsp_solution.notify();
                });
            };

            this.isElasticNets = function () {
                return this.method.name == 'elastic-nets';
            };

            this.isMonteCarlo = function () {
                return this.method.name == 'monte-carlo';
            };

            this.isConcorde = function () {
                return this.method.name == 'concorde';
            };

            this.isGreedy = function () {
                return this.method.name == 'greedy';
            };

            this.changeMethod = function () {
                switch (this.method.name) {
                    case 'concorde':
                        this.method_params = this.concorde_params;
                        break;
                    case 'monte-carlo':
                        this.method_params = {};
                        break;
                    case 'greedy':
                        this.method_params = {};
                        break;
                    case 'elastic-nets':
                        this.method_params = this.elastic_nets_params;
                }
            };

            this.result = {};
            this.num_iterations = 1000;
            this.tsp_model = TSPModel;
            this.methods = [{
                name: "monte-carlo"
            }, {
                name: "concorde"
            }, {
                name: "greedy"
            }, {
                name: "elastic-nets"
            }];
            this.method = this.methods[0];
            this.concorde_params = {
                name: 'Default name',
                description: 'Default description'
            };

            this.elastic_nets_params = {
                alpha: 0.2,
                beta: 2.0,
                num_neurons_factor: 2.5,
                k: 0.2,
                epsilon: 0.02,
                k_num_iter: 25,
                k_alpha: 0.99,
                radius: 0.1,
                num_iter_max: 100
            };

            $scope.tsp_solution = TSPSolution;
            this.method_params = {};
        }
    ]);

    app.controller('TSPGeneratorController', [
        '$scope',
        '$http',
        '$location',
        'TSPModel',
        'TSPGenerator',
        function ($scope, $http, $location, TSPModel, TSPGenerator) {
            this.generate = function () {
                var that = this,
                    http_config = {
                        params: {
                            min: this.generator.min,
                            max: this.generator.max,
                            sym: this.generator.symmetric,
                            num: TSPModel.number_of_items
                        }
                    };
                $http.get('http://' + $location.host() + ':3000/api/generate', http_config)
                    .then(function (result) {
                        if (result.statusText == 'OK') {
                            that.tsp_model.matrix = result.data.items;
                        }
                    });
            };

            this.generator = TSPGenerator;
            this.tsp_model = TSPModel;
        }
    ]);

    app.controller('TSPPlotController', [
        '$scope',
        '$http',
        '$location',
        'TSPModel',
        'TSPSolution',
        function ($scope, $http, $location, TSPModel, TSPSolution) {
            /*
             * Clears the drawing area and resets the TSP model.
             */
            this.clear = function () {
                d3.select('.tsp-plot svg').selectAll('circle,path,text').remove();
                this.circles_dataset = [];
                this.number_of_items = 0;
                this.tsp_model.reset();
                this.number_of_solutions = 0;
            };

            /*
             * Parses the drawen model.
             *
             * The function connects circles with lines and calculates their length.
             * The values are then passed to the server in POST request to build the
             * matrix.
             */
            this.plotToMatrix = function () {
                var svg_container = d3.select('.tsp-plot svg');
                var circles = svg_container.selectAll('circle');
                if (typeof circles[0] !== 'undefined') {
                    svg_container.selectAll('path').remove();
                    circles = circles[0];
                    TSPModel.number_of_items = circles.length;
                    var items = _.range(circles.length);
                    var result = [],
                        distances = [],
                        e1, e2, x1, y1, x2, y2, line, line_data;


                    //This is the accessor function we talked about above
                    var lineFunction = d3.svg.line()
                        .x(function (d) {
                            return d.x;
                        })
                        .y(function (d) {
                            return d.y;
                        })
                        .interpolate('linear');

                    angular.forEach(items, function (value, key) {
                        angular.forEach(items, function (inner_value, inner_key) {
                            if (inner_key != key) {
                                result.push([value, inner_value]);
                            }
                        });
                    });

                    angular.forEach(result, function (pair, key) {
                        e1 = pair[0];
                        e2 = pair[1];
                        x1 = circles[e1].cx.baseVal.value;
                        y1 = circles[e1].cy.baseVal.value;
                        x2 = circles[e2].cx.baseVal.value;
                        y2 = circles[e2].cy.baseVal.value;
                        line_data = [{
                            'x': x1,
                            'y': y1
                        }, {
                            'x': x2,
                            'y': y2
                        }];
                        line = svg_container.append('path')
                            .attr('d', lineFunction(line_data))
                            .attr('stroke', 'blue')
                            .attr('stroke-width', 0.0)
                            .attr('fill', 'none')
                            .attr('tsp-persist', 'tsp-persist');

                        distances.push({
                            'e1': e1,
                            'e2': e2,
                            'distance': line[0][0].getTotalLength()
                        });

                    });


                    var that = this,
                        http_config = {
                            params: {
                                'num': this.tsp_model.number_of_items,
                                'distances': distances
                            }
                        };

                    $http.post('http://' + $location.host() + ':3000/api/plotToMatrix', http_config)
                        .then(function (result) {
                            if (result.statusText == 'OK') {
                                that.tsp_model.matrix = result.data.items;
                            }
                        });

                }
            };

            this.visualize = function () {

            };

            this.drawCircles = function () {
                var that = this;
                d3.select(".tsp-plot svg")
                    .selectAll("circle")
                    .data(this.circles_dataset)
                    .enter()
                    .append("circle")
                    .attr("cx", function (d) {
                        return d.x_axis;
                    })
                    .attr("cy", function (d) {
                        return d.y_axis;
                    })
                    .attr("r", function (d) {
                        return d.radius;
                    })
                    .attr("tsp_id", function (d) {
                        return d.id;
                    })
                    .style("fill", function (d) {
                        return d.color;
                    })
                    .on("click", function (e) {
                        if (that.isClickModeRemove()) {
                            var id = parseInt(this.getAttribute('tsp_id'));
                            var circle_data = that.circles_dataset[id];
                            that.tsp_model.coordinates = _.filter(that.tsp_model.coordinates,
                                function(value) {
                                    return !_.isEqual(value, [circle_data.x_axis, circle_data.y_axis]);
                                });


                            that.circles_dataset.splice(id, 1);
                            that.number_of_items--;
                            var i = 0;

                            angular.forEach(that.circles_dataset, function (value, key) {
                                that.circles_dataset[key].id = i++;
                                //if (parseInt(value.id) > id) {
                                //    that.circles_dataset[key].id--;
                                //}

                            });

                            d3.select('.tsp-plot svg').selectAll('circle,path,text').remove();


                            //that.tsp_model.coordinates.remove([mouse[0], mouse[1]]);

                            that.drawCircles();
                        }
                   });

                d3.select(".tsp-plot svg")
                    .selectAll("text")
                    .data(this.circles_dataset)
                    .enter()
                    .append("text")
                    .attr("dx", function (d) {
                        return d.x_axis;
                    })
                    .attr("dy", function (d) {
                        return d.y_axis;
                    })
                    .text(function (d) {
                        // -1 to start with zero.
                        return d.id;
                    });

                if (this.auto_parse) {
                    this.plotToMatrix();
                }

            }

            this.initSVGPlot = function () {
                var mouse,
                    that = this;

                var fac = function (x) {
                    return _.reduce(_.range(1, x + 1), function (total, y) {
                        return total * y
                    })
                };

                svgContainer = d3.select(".tsp-plot .tsp-plot-container").append("svg")
                    .attr("width", 600)
                    .attr("height", 300).on('click', function () {
                        if (that.isClickModeInsert()) {
                            mouse = d3.mouse(this);
                            that.circles_dataset.push({
                                "x_axis": mouse[0],
                                "y_axis": mouse[1],
                                "radius": 5,
                                "color": "purple",
                                "id": that.number_of_items
                            });
                            that.tsp_model.coordinates.push([mouse[0], mouse[1]]);
                            that.number_of_items++;

                            // For < 3 items there is only one route.
                            if (that.number_of_items > 3) {
                                that.number_of_solutions = fac(that.number_of_items - 1) / 2;
                            }
                            that.drawCircles();
                        }
                    });

                //setTimeout(function(){
                //    var ena_model = [
                //        [145, 215],
                //        [151, 264],
                //        [159, 261],
                //        [130, 254],
                //        [128, 252],
                //        [163, 247],
                //        [146, 246],
                //        [161, 242],
                //        [142, 239],
                //        [163, 236],
                //        [148, 232],
                //        [128, 231],
                //        [156, 217],
                //        [129, 214],
                //        [146, 208],
                //        [164, 208],
                //        [141, 206],
                //        [147, 193],
                //        [164, 193],
                //        [129, 189],
                //        [155, 185],
                //        [139, 182]
                //    ];
                //
                //    _.each(ena_model, function(item) {
                //        that.circles_dataset.push({
                //            "x_axis": item[0],
                //            "y_axis": item[1],
                //            "radius": 5,
                //            "color": "purple",
                //            "id": that.number_of_items
                //        });
                //        that.tsp_model.coordinates.push([item[0], item[1]]);
                //        that.number_of_items++;
                //
                //        // For < 3 items there is only one route.
                //        if (that.number_of_items > 3) {
                //            that.number_of_solutions = fac(that.number_of_items - 1) / 2;
                //        }
                //    })
                //
                //    that.drawCircles();
                //
                //}, 500);
            };

            this.number_of_items = 0;
            this.number_of_solutions = 0;
            this.circles_dataset = [];
            this.initSVGPlot();
            this.auto_parse = true;
            this.tsp_model = TSPModel;
            $scope.solution = TSPSolution;
            this.click_modes = [{
                name: "insert"
            }, {
                name: "remove"
            }];
            this.click_mode = this.click_modes[0];

            this.isClickModeInsert = function () {
                return this.click_mode.name == 'insert';
            };

            this.isClickModeRemove = function () {
                return this.click_mode.name == 'remove';
            };
            var that = this;
            $scope.$on('solution:updated', function () {
                if (that.number_of_items == 0) {
                    return;
                }
                var svg_container = d3.select('.tsp-plot svg');
                var circles = d3.selectAll('circle');
                var min_route = $scope.solution.getMinRoute();
                var lines = [];
                if (!min_route) {
                    return;
                }

                // Clone initial array.
                var shifted_route = min_route.slice(0);

                // Make the first element last.
                shifted_route.push(shifted_route.shift());

                // Builds pairs of element.
                var pairs = _.zip(min_route, shifted_route);

                // Remove (0, 0) pair.
                pairs.pop();

                //This is the accessor function we talked about above
                var lineFunction = d3.svg.line()
                    .x(function (d) {
                        return d.x;
                    })
                    .y(function (d) {
                        return d.y;
                    })
                    .interpolate('linear');

                svg_container.selectAll('path').filter(function () {
                    return !this.hasAttribute('tsp-persist');
                }).remove();

                angular.forEach(pairs, function (value, key) {
                    var x1, x2, y1, y2, line_data, line;
                    var circles_to_connect = circles.filter(function (d) {
                        return d.id == value[0] || d.id == value[1];
                    })[0];
                    //console.log(circles_to_connect);

                    x1 = circles_to_connect[0].cx.baseVal.value;
                    y1 = circles_to_connect[0].cy.baseVal.value;
                    x2 = circles_to_connect[1].cx.baseVal.value;
                    y2 = circles_to_connect[1].cy.baseVal.value;
                    line_data = [{
                        'x': x1,
                        'y': y1
                    }, {
                        'x': x2,
                        'y': y2
                    }];
                    line = svg_container.append('path')
                        .attr('d', lineFunction(line_data))
                        .attr('stroke', 'red')
                        .attr('stroke-width', 3.0)
                        .attr('fill', 'none');
                });

            });
        }
    ]);

    app.directive('tspGenerator', function () {
        return {
            restrict: 'E',
            templateUrl: 'templates/tsp-generator.html'
        };
    });

    app.directive('tspParser', function () {
        return {
            restrict: 'E',
            templateUrl: 'templates/tsp-parser.html'
        };
    });

    app.directive('tspSolver', function () {
        return {
            restrict: 'E',
            templateUrl: 'templates/tsp-solver.html'
        };
    });

    app.directive('tspModelView', function () {
        return {
            restrict: 'E',
            templateUrl: 'templates/tsp-model-view.html'
        };
    });

    app.directive('tspPlot', function () {
        return {
            restrict: 'E',
            templateUrl: 'templates/tsp-plot.html'
        };
    });

    app.directive('fileModel', ['$parse',
        function ($parse) {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    var model = $parse(attrs.fileModel);
                    var modelSetter = model.assign;

                    element.bind('change', function () {
                        scope.$apply(function () {
                            modelSetter(scope, element[0].files[0]);
                        });
                    });
                }
            };
        }
    ]);

    app.service('fileUpload', ['$http', '$location',
        function ($http, $location) {
            this.uploadFileToUrl = function (file, uploadUrl, success_callback) {
                var fd = new FormData();
                fd.append('file', file);
                $http.post('http://' + $location.host() + ':3000' + uploadUrl, fd, {
                    transformRequest: angular.identity,
                    headers: {
                        'Content-Type': undefined
                    }
                }).success(success_callback).error(function () {
                });
            }
        }
    ]);

})();
