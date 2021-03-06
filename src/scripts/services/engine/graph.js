(function () {
    'use strict';

    function Graph() {
        var context,
            ratio,
            offset = 12,
            netCapacity = 40,
            epsilon = 0.00000000000001,
            netRatio;

        function _calculateScale(plotPoints) {
            var maxY = _.max(plotPoints, function (item) {
                return item.y;
            });
            var minY = _.min(plotPoints, function (item) {
                return item.y;
            });
            var maxX = _.max(plotPoints, function (item) {
                return item.x;
            });
            var minX = _.min(plotPoints, function (item) {
                return item.x;
            });
            var yHeight = netRatio ? context.canvas.height - (maxY.y - minY.y) / netRatio.y : 0;
            var ratioOffset = netRatio ? 0 : offset * 2;
            ratio = {
                x: (maxX.x - minX.x) / (context.canvas.width - offset * 2),
                y: (maxY.y - minY.y) / (context.canvas.height - yHeight - ratioOffset),
                xCorrection: minX.x,
                yCorrection: netRatio ? netRatio.yCorrection : minY.y,
                yHeight: yHeight
            };
        }

        function _translateCoordinate(point, inverty) {
            if (inverty) {
                return {
                    x: (point.x - ratio.xCorrection) / ratio.x + offset,
                    y: context.canvas.height - (point.y - ratio.yCorrection) / ratio.y - offset
                };
            }
            else {
                return {
                    x: (point.x - ratio.xCorrection) / ratio.x + offset,
                    y: (point.y - ratio.yCorrection) / ratio.y + offset
                };
            }
        }

        function _predicate(item) {
            /*jshint validthis: true */
            return item.identifier.value === this.name;
        }

        function _toFixedDecimal(value, places) {
            return +(Math.round(value + "e+" + places) + "e-" + places);
        }

        function _calculatePoints(formula, ctx, variable) {
            if (variable.bottomMargin >= variable.topMargin) {
                throw 'The variable ranges must be specified correctly.';
            }

            if ((variable.topMargin - variable.bottomMargin) < variable.step) {
                throw 'The step value must be lower than range.';
            }

            if ((variable.topMargin - variable.bottomMargin) / variable.step > netCapacity) {
                throw 'There is not enough graph capacity to display the net.';
            }

            var points = [];
            var abscissa = _.find(ctx, _predicate.bind(variable));
            var defaultValue = abscissa.value;
            for (var value = variable.bottomMargin; value <= variable.topMargin || (value > variable.topMargin && Math.abs(value - variable.topMargin) <= epsilon); value += variable.step) {
                abscissa.value = value;
                points.push({ x: value, y: formula.evaluate(ctx) });
            }
            abscissa.value = defaultValue;
            return points;
        }

        function _getValuesCollection(plotPoints) {
            var maxY = _.max(plotPoints, function (item) {
                return item.y;
            });
            var minY = _.min(plotPoints, function (item) {
                return item.y;
            });
            var denominator = 1;
            while ((maxY.y - minY.y) / denominator > netCapacity) {
                denominator *= 10;
            }
            var result = [];
            for (var value = Math.floor(minY.y / denominator); value <= Math.ceil(maxY.y / denominator); value++) {
                result.push(value * denominator);
            }
            return result;
        }

        function _calculateNetLines(plotPoints, variable) {
            var netLines = [];
            var maxY = _.max(plotPoints, function (item) {
                return item.y;
            });
            var minY = _.min(plotPoints, function (item) {
                return item.y;
            });
            for (var value = variable.bottomMargin; value <= variable.topMargin || (value > variable.topMargin && Math.abs(value - variable.topMargin) <= epsilon); value += variable.step) {
                netLines.push({
                    from: {
                        x: value,
                        y: minY.y
                    },
                    to: {
                        x: value,
                        y: maxY.y
                    }
                });
            }

            var values = _getValuesCollection(plotPoints);
            for (var index = 0; index < values.length; index++) {
                var element = values[index];
                netLines.push({
                    from: {
                        x: variable.bottomMargin,
                        y: element
                    },
                    to: {
                        x: variable.topMargin,
                        y: element
                    }
                });
            }

            return netLines;
        }

        function _connectPoints(plotPoints, variable) {
            context.beginPath();
            var coordinate = _translateCoordinate(plotPoints[0], true);
            context.moveTo(coordinate.x, coordinate.y);
            for (var index = 1; index < plotPoints.length; index++) {
                var element = plotPoints[index];
                coordinate = _translateCoordinate(element, true);
                context.lineTo(coordinate.x, coordinate.y);
            }

            context.lineJoin = 'round';
            context.strokeStyle = variable.color;
            context.stroke();
            context.closePath();
        }

        function _drawLines(netLines) {
            context.beginPath();
            for (var index = 0; index < netLines.length; index++) {
                var line = netLines[index];
                var fromPoint = _translateCoordinate(line.from);
                var toPoint = _translateCoordinate(line.to);
                if (line.from.x === line.to.x) {
                    context.font = '12px Arial';
                    context.fillStyle = 'red';
                    context.fillText(_toFixedDecimal(line.from.x, 2), toPoint.x - offset / 2, toPoint.y + offset);
                }

                if (line.from.y === line.to.y) {
                    fromPoint = _translateCoordinate(line.from, true);
                    toPoint = _translateCoordinate(line.to, true);

                    context.font = '12px Arial';
                    context.fillStyle = 'red';
                    context.fillText(line.from.y, fromPoint.x - offset, toPoint.y + offset / 2);
                }
                context.moveTo(fromPoint.x, fromPoint.y);
                context.lineTo(toPoint.x, toPoint.y);
            }

            context.strokeStyle = '#aaa';
            context.stroke();
            context.closePath();
        }

        function _plot(formula, ctx, variables) {
            if (variables.length > 1) {
                // make 3-d graph
            }

            if (variables.length === 1) {
                // make 2-d graph
                var plotPoints = _calculatePoints(formula, ctx, variables[0]);
                _calculateScale(plotPoints);
                _connectPoints(plotPoints, variables[0]);
            }
        }

        function _init(ctx) {
            context = ctx;
        }

        function _clear() {
            context.clearRect(0, 0, context.canvas.width, context.canvas.height);
            netRatio = null;
            ratio = null;
        }

        function _plotNet(formula, ctx, variables, ranges) {
            var plotPoints = [];
            _.each(variables, function (variable) {
                var abscissa = _.find(ctx, _predicate.bind({ name: variable.identifier.value }));
                var defaultValue = abscissa.value;
                abscissa.value = ranges.topMargin;
                plotPoints.push({
                    x: abscissa.value,
                    y: formula.evaluate(ctx)
                });
                abscissa.value = ranges.bottomMargin;
                plotPoints.push({
                    x: abscissa.value,
                    y: formula.evaluate(ctx)
                });
                abscissa.value = defaultValue;
            });
            var netLines = _calculateNetLines(plotPoints, ranges);
            _calculateScale(plotPoints);
            netRatio = angular.copy(ratio);
            _drawLines(netLines);
        }

        this.init = _init;
        this.plot = _plot;
        this.plotNet = _plotNet;
        this.clear = _clear;
    }

    angular.module('dps.engine').service('graph', Graph);
} ());