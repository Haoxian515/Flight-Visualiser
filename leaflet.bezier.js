'use strict';

// console.log("leaflet")

L.SVG.include({
    _updatecurve: function _updatecurve(layer) {
        var svg_path = this._curvePointsToPath(layer._points);
        this._setPath(layer, svg_path);

        if (layer.options.animate) {
            var path = layer._path;
            var length = path.getTotalLength();

            if (!layer.options.dashArray) {
                path.style.strokeDasharray = length + ' ' + length;
            }

            if (layer._initialUpdate) {
                path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], layer.options.animate);
                layer._initialUpdate = false;
            }
        }

        return svg_path;
    },

    _curvePointsToPath: function _curvePointsToPath(points) {
        var point = void 0,
            curCommand = void 0,
            str = '';
        for (var i = 0; i < points.length; i++) {
            point = points[i];
            if (typeof point === 'string' || point instanceof String) {
                curCommand = point;
                str += curCommand;
            } else str += point.x + ',' + point.y + ' ';
        }
        return str || 'M0 0';
    }

});

var Bezier = L.Path.extend({
    options: {},
    initialize: function initialize(path, icon, options) {

        if (!path.mid || path.mid[0] === undefined) {
            path.mid = this.getMidPoint(path.from, path.to, path.from.deep ? path.from.deep : 4, path.from.slide);
        }

        L.setOptions(this, options);
        this._initialUpdate = true;
        this.setPath(path);
        this.icon = icon;
    },
    //Juast after path is added
    onAdd: function onAdd(map) {
        this._renderer._initPath(this);
        this._reset();
        this._renderer._addPath(this);

        // TODO ajust plane acording to zoom
        map.on('zoom', function () {});
    },
    setAnimatePlane: function setAnimatePlane(path) {

        var self = this;

        if (this.spaceship_img) this.spaceship_img.remove();

        var SnapSvg = Snap('.leaflet-overlay-pane>svg');

        var spaceship_img = this.spaceship_img = SnapSvg.image(this.icon.path).attr({
            visibility: "hidden"
        });

        var spaceship = SnapSvg.group(spaceship_img);
        var flight_path = SnapSvg.path(path).attr({
            'fill': 'none',
            'stroke': 'none'
        });

        var full_path_length = Snap.path.getTotalLength(flight_path);
        var half_path_length = full_path_length / 2;
        var third_path_length = full_path_length / 3;
        var forth_path_length = full_path_length / 4;

        var width = forth_path_length / this._map.getZoom();
        var height = forth_path_length / this._map.getZoom();

        width = Math.min(Math.max(width, 30), 64);
        height = Math.min(Math.max(height, 30), 64);

        var last_step = 0;

        Snap.animate(0, forth_path_length / 10, function (step) {

            //show image when plane start to animate
            spaceship_img.attr({
                visibility: "visible"
            });

            spaceship_img.attr({ width: width, height: height, class: self.icon.class });

            last_step = step;

            var moveToPoint = Snap.path.getPointAtLength(flight_path, step);

            var x = moveToPoint.x - width / 2;
            var y = moveToPoint.y - height / 2;

            spaceship.transform('translate(' + x + ',' + y + ') rotate(' + (moveToPoint.alpha - 90) + ', ' + width / 2 + ', ' + height / 2 + ')');
        }, 500, mina.easeout, function () {

            Snap.animate(forth_path_length / 10, full_path_length, function (step) {

                last_step = step;
                var moveToPoint = Snap.path.getPointAtLength(flight_path, step);

                var x = moveToPoint.x - width / 2;
                var y = moveToPoint.y - height / 2;
                spaceship.transform('translate(' + x + ',' + y + ') rotate(' + (moveToPoint.alpha - 90) + ', ' + width / 2 + ', ' + height / 2 + ')');
            }, 1500, mina.easeout, function () {
                //done

            });
        });
    },
    getPath: function getPath() {
        return this._coords;
    },
    setPath: function setPath(path) {
        this._setPath(path);
        return this.redraw();
    },
    getBounds: function getBounds() {
        return this._bounds;
    },
    getMidPoint: function getMidPoint(from, to, deep) {
        var round_side = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'LEFT_ROUND';

        var offset = 3.14;

        if (round_side === 'RIGHT_ROUND') offset = offset * -1;

        var latlngs = [];

        var latlng1 = from,
            latlng2 = to;

        var offsetX = latlng2.lng - latlng1.lng,
            offsetY = latlng2.lat - latlng1.lat;

        var r = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2)),
            theta = Math.atan2(offsetY, offsetX);

        var thetaOffset = offset / (deep ? deep : 4);

        var r2 = r / 2 / Math.cos(thetaOffset),
            theta2 = theta + thetaOffset;

        var midpointX = r2 * Math.cos(theta2) + latlng1.lng,
            midpointY = r2 * Math.sin(theta2) + latlng1.lat;

        var midpointLatLng = [midpointY, midpointX];

        latlngs.push(latlng1, midpointLatLng, latlng2);

        return midpointLatLng;
    },
    _setPath: function _setPath(path) {
        this._coords = path;
        this._bounds = this._computeBounds();
    },
    _computeBounds: function _computeBounds() {

        var bound = new L.LatLngBounds();

        bound.extend(this._coords.from);
        bound.extend(this._coords.to); //for single destination
        bound.extend(this._coords.mid);

        return bound;
    },
    getCenter: function getCenter() {
        return this._bounds.getCenter();
    },
    _update: function _update() {
        if (!this._map) {
            return;
        }
        this._updatePath();
    },
    _updatePath: function _updatePath() {
        //animated plane
        var path = this._renderer._updatecurve(this);
        this.setAnimatePlane(path);
    },
    _project: function _project() {

        this._points = [];

        this._points.push('M');

        var curPoint = this._map.latLngToLayerPoint(this._coords.from);
        this._points.push(curPoint);

        if (this._coords.mid) {
            this._points.push('Q');
            curPoint = this._map.latLngToLayerPoint(this._coords.mid);
            this._points.push(curPoint);
        }
        curPoint = this._map.latLngToLayerPoint(this._coords.to);
        this._points.push(curPoint);
    }

});

L.bezier = function (config, options) {
    var paths = [];
    for (var i = 0; config.path.length > i; i++) {
        var last_destination = false;
        for (var c = 0; config.path[i].length > c; c++) {

            var current_destination = config.path[i][c];
            if (last_destination) {
                var path_pair = { from: last_destination, to: current_destination };
                paths.push(new Bezier(path_pair, config.icon, options));
            }

            last_destination = config.path[i][c];
        }
    }
    return L.layerGroup(paths);
};