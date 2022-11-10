function ab2xyz (pt_ab)
{
  return {x: Math.sin (pt_ab.a) * Math.cos (pt_ab.b),
          y: Math.sin (pt_ab.b),
          z: Math.cos (pt_ab.a) * Math.cos (pt_ab.b)};
}

function xyz2ab (pt_xyz)
{
  return {a: Math.atan2 (pt_xyz.x, pt_xyz.z),
          b: Math.asin (pt_xyz.y)};
}

function loadJsonData (src_url, converter, data)
{
  let request = new XMLHttpRequest ();
  request.overrideMimeType ("application/json");
  request.open ("GET", src_url, true);
  request.onreadystatechange = function () {
    if (request.readyState == 4 && request.status == "200")
    {
      json_data = JSON.parse (request.responseText);
      converter (json_data, data);
    }
    data.loaded = true;
    resize_handler.catchResize (null);
  };
  request.send (null);
}

function json2MapData (json_data, data)
{
  for (const data_set of json_data)
  {
    let point_set = [];
    for (const element of data_set)
    {
      point_set.push (ab2xyz ({a: element[0] * Math.PI / 180.0, b: element[1] * Math.PI / 180.0}));
    }
    data.polygons.push (point_set);
  }
  map_data2.polygons = structuredClone (data.polygons);
  map_data2.loaded = true;
}

function CityData ()
{
  this.loaded = false;
  this.data = {};
  this.polygons = [];
}

var city_data = new CityData ();

function json2CityData (json_data, data)
{
  for (const [key, value] of Object.entries (json_data))
  {
    data.data[key] = ab2xyz ({a: value[0] * Math.PI / 180.0, b: value[1] * Math.PI / 180.0});
  }
  let pt_B = data.data["Berlin"];
  let pt_C = data.data["Canberra"];
  let dot = ptDotPt (pt_B, pt_C);
  let phi = Math.acos (dot);
  let sphi = Math.sin (phi);
  let pt_h = {x: (pt_C.x - pt_B.x * dot) / sphi,
              y: (pt_C.y - pt_B.y * dot) / sphi,
              z: (pt_C.z - pt_B.z * dot) / sphi};
  let step_width = Math.PI / 180.0 / 60; // minutes -> 1 seamile
  let point_set = [];
  for (let beta = 0.0; beta <= phi; beta += step_width)
  {
    let cbeta = Math.cos (beta);
    let sbeta = Math.sin (beta);
    point_set.push ({x: pt_B.x * cbeta + pt_h.x * sbeta,
                    y: pt_B.y * cbeta + pt_h.y * sbeta,
                    z: pt_B.z * cbeta + pt_h.z * sbeta});
  }
  data.polygons.push (point_set);
}

function ptDotPt (pt_xyz_1, pt_xyz_2)
{
  return pt_xyz_1.x * pt_xyz_2.x + pt_xyz_1.y * pt_xyz_2.y + pt_xyz_1.z * pt_xyz_2.z;
}

const I = [[1.0, 0.0, 0.0],
           [0.0, 1.0, 0.0],
           [0.0, 0.0, 1.0]];

function matMulPt (mat, pt_xyz)
{
  return {x: pt_xyz.x * mat[0][0] + pt_xyz.y * mat[0][1] + pt_xyz.z * mat[0][2],
          y: pt_xyz.x * mat[1][0] + pt_xyz.y * mat[1][1] + pt_xyz.z * mat[1][2],
          z: pt_xyz.x * mat[2][0] + pt_xyz.y * mat[2][1] + pt_xyz.z * mat[2][2]};
}

function matMulMat (ma, mb)
{
  return [[ma[0][0] * mb[0][0] + ma[0][1] * mb[1][0] + ma[0][2] * mb[2][0],
           ma[0][0] * mb[0][1] + ma[0][1] * mb[1][1] + ma[0][2] * mb[2][1],
           ma[0][0] * mb[0][2] + ma[0][1] * mb[1][2] + ma[0][2] * mb[2][2]],

          [ma[1][0] * mb[0][0] + ma[1][1] * mb[1][0] + ma[1][2] * mb[2][0],
           ma[1][0] * mb[0][1] + ma[1][1] * mb[1][1] + ma[1][2] * mb[2][1],
           ma[1][0] * mb[0][2] + ma[1][1] * mb[1][2] + ma[1][2] * mb[2][2]],

          [ma[2][0] * mb[0][0] + ma[2][1] * mb[1][0] + ma[2][2] * mb[2][0],
           ma[2][0] * mb[0][1] + ma[2][1] * mb[1][1] + ma[2][2] * mb[2][1],
           ma[2][0] * mb[0][2] + ma[2][1] * mb[1][2] + ma[2][2] * mb[2][2]]];
}

function getRotMatX (a)
{
  return [[1.0, 0.0, 0.0],
          [0.0, Math.cos (a), -Math.sin (a)],
          [0.0, Math.sin (a), Math.cos (a)]];
}

function getRotMatY (a)
{
  return [[Math.cos (a), 0.0, Math.sin (a)],
          [0.0, 1.0, 0.0],
          [-Math.sin (a), 0.0, Math.cos (a)]];
}

function getRotMatZ (a)
{
  return [[Math.cos (a), -Math.sin (a), 0.0],
          [Math.sin (a), Math.cos (a), 0.0],
          [0.0, 0.0, 1.0]];
}

function Transformator ()
{
  this.rot_mat = I;
  this.rotate = function (rx, ry, rz) {
    this.rot_mat = matMulMat (this.rot_mat, matMulMat (matMulMat (getRotMatX (rx), getRotMatY (ry)), getRotMatZ (rz)));
  }
  this.transformPoint = function (pt_xyz) {
    return matMulPt (this.rot_mat, pt_xyz);
  }
  this.transformMapData = function (md) {
    for (let i = 0; i < md.polygons.length; i++)
    {
      for (let j = 0; j < md.polygons[i].length; j++)
      {
        md.polygons[i][j] = this.transformPoint (md.polygons[i][j]);
      }
    }
  }
}

class MapData
{
  constructor ()
  {
    this.loaded = false;
    this.polygons = [];
    this.transformator = new Transformator ();
  }
}

var map_data1 = new MapData ();
var map_data2 = new MapData ();

function EquirectangularProjector ()
{
  this._side_ratio = 2.0;
  this._scale = 1.0;
  this._offset = {x: 0, y: 0};
  this._width = 128;
  this._height = 64;
  this._getScale = function () {
    if (this._width / this._height > this._side_ratio)
    {
      return this._height / Math.PI;
    }
    else
    {
      return this._width / this._side_ratio / Math.PI;
    }
  }
  this._getOffset = function () {
    return {x: this._width / 2.0 - this._scale * Math.PI,
            y: (this._height - this._scale * Math.PI) / 2.0};
  }
  this.setWidth = function (width) {
    this._width = width;
    this._scale = this._getScale ();
    this._offset = this._getOffset ();
  }
  this.setHeight = function (height) {
    this._height = height;
    this._scale = this._getScale ();
    this._offset = this._getOffset ();
  }
  this.projectPoint = function (pt_ab) {
    return {x: this._scale * (pt_ab.a + Math.PI) + this._offset.x,
            y: this._scale * (Math.PI / 2.0 - pt_ab.b) + this._offset.y};
  }
  this.backProjectPoint = function (pt_xy) {
    return {a: (pt_xy.x - this._offset.x) / this._scale - Math.PI,
            b: Math.PI / 2.0 - (pt_xy.y - this._offset.y) / this._scale};
  }
  this.drawPassepartout = function (context) {
    context.fillStyle = '#101010';
    context.fillRect (0, 0, this._width, this._height);
    context.fillStyle = '#8888FF'
    context.fillRect (this._offset.x, this._offset.y, this._width - 2 * this._offset.x, this._height - 2 * this._offset.y);
  }
  this.suppressLine = function (from, to) {
    return Math.abs (to.a - from.a) > Math.PI || Math.abs (to.b - from.b) > Math.PI / 2.0;
  }
}

function OrthographicProjector ()
{
  this._scale = 1.0;
  this._offset = {x: 0, y: 0};
  this._width = 64;
  this._height = 64;
  this._getScale = function () {
    if (this._width > this._height)
    {
      return this._height;
    }
    else
    {
      return this._width;
    }
  }
  this._getOffset = function () {
    return {x: (this._width - this._scale) / 2.0,
            y: (this._height - this._scale) / 2.0};
  }
  this.setWidth = function (width) {
    this._width = width;
    this._scale = this._getScale ();
    this._offset = this._getOffset ();
  }
  this.setHeight = function (height) {
    this._height = height;
    this._scale = this._getScale ();
    this._offset = this._getOffset ();
  }
  this.projectPoint = function (pt_ab) {
    return {x: this._scale / 2.0 * (1.0 + Math.sin (pt_ab.a) * Math.cos (pt_ab.b)) + this._offset.x,
            y: this._scale / 2.0 * (1.0 + Math.sin (-pt_ab.b)) + this._offset.y};
  }
  this.backProjectPoint = function (pt_xy) {
    let b = -Math.asin (2.0 * (pt_xy.y - this._offset.y) / this._scale - 1.0);
    return {a: Math.asin ((2.0 * (pt_xy.x - this._offset.x) / this._scale - 1.0) / Math.cos (b)),
            b: b};
  }
  this.drawPassepartout = function (context) {
    context.fillStyle = '#101010';
    context.fillRect (0, 0, this._width, this._height);
    context.fillStyle = '#8888FF';
    context.beginPath ();
    context.arc (this._width / 2.0, this._height / 2.0, this._scale / 2.0, 0, Math.PI * 2.0, true);
    context.fill ();
  }
  this.suppressLine = function (from, to) {
    let lim = Math.PI / 2.0;
    return Math.abs (to.a) > lim || Math.abs (to.b) > lim || Math.abs (from.a) > lim || Math.abs (from.b) > lim;
  }
}

function MercatorProjector ()
{
  this._lat_limit = 80.0 / 180.0 * Math.PI;
  this._lat_prj_limit = Math.atanh (Math.sin (this._lat_limit));
  this._side_ratio = Math.PI / this._lat_prj_limit;
  this._scale = 1.0; // along x-axis (equator)
  this._offset = {x: 0, y: 0};
  this._width = 128;
  this._height = 64;
  this._getScale = function () {
    if (this._width / this._height > this._side_ratio)
    {
      return this._height * this._side_ratio / 2.0 / Math.PI;
    }
    else
    {
      return this._width / 2.0 / Math.PI;
    }
  }
  this._getOffset = function () {
    return {x: this._width / 2.0 - this._scale * Math.PI,
            y: this._height / 2.0 - this._scale * Math.PI / this._side_ratio};
  }
  this.setWidth = function (width) {
    this._width = width;
    this._scale = this._getScale ();
    this._offset = this._getOffset ();
  }
  this.setHeight = function (height) {
    this._height = height;
    this._scale = this._getScale ();
    this._offset = this._getOffset ();
  }
  this.projectPoint = function (pt_ab) {
    return {x: this._scale * (pt_ab.a + Math.PI) + this._offset.x,
            y: this._scale * (this._lat_prj_limit - Math.atanh (Math.sin (pt_ab.b))) + this._offset.y};
  }
  this.backProjectPoint = function (pt_xy) {
    return {a: (pt_xy.x - this._offset.x) / this._scale - Math.PI,
            b: Math.asin (Math.tanh (this._lat_prj_limit - (pt_xy.y - this._offset.y) / this._scale))};
  }
  this.drawPassepartout = function (context) {
    context.fillStyle = '#101010';
    context.fillRect (0, 0, this._width, this._height);
    context.fillStyle = '#8888FF';
    context.fillRect (this._offset.x, this._offset.y, this._width - 2 * this._offset.x, this._height - 2 * this._offset.y);
  }
  this.suppressLine = function (from, to) {
    return Math.abs (to.b) > this._lat_limit || Math.abs (from.b) > this._lat_limit || Math.abs (to.a - from.a) > Math.PI || Math.abs (to.b - from.b) > Math.PI / 2.0;
  }
}

function CylindricProjector ()
{
  this._lat_limit = 70.0 / 180.0 * Math.PI;
  this._lat_prj_limit = Math.tan (this._lat_limit);
  this._side_ratio = Math.PI / this._lat_prj_limit;
  this._scale = 1.0; // along x-axis (equator)
  this._offset = {x: 0, y: 0};
  this._width = 128;
  this._height = 64;
  this._getScale = function () {
    if (this._width / this._height > this._side_ratio)
    {
      return this._height * this._side_ratio / 2.0 / Math.PI;
    }
    else
    {
      return this._width / 2.0 / Math.PI;
    }
  }
  this._getOffset = function () {
    return {x: this._width / 2.0 - this._scale * Math.PI,
            y: this._height / 2.0 - this._scale * Math.PI / this._side_ratio};
  }
  this.setWidth = function (width) {
    this._width = width;
    this._scale = this._getScale ();
    this._offset = this._getOffset ();
  }
  this.setHeight = function (height) {
    this._height = height;
    this._scale = this._getScale ();
    this._offset = this._getOffset ();
  }
  this.projectPoint = function (pt_ab) {
    return {x: this._scale * (pt_ab.a + Math.PI) + this._offset.x,
            y: this._scale * (this._lat_prj_limit - Math.tan (pt_ab.b)) + this._offset.y};
  }
  this.backProjectPoint = function (pt_xy) {
    return {a: (pt_xy.x - this._offset.x) / this._scale - Math.PI,
            b: Math.atan (this._lat_prj_limit - (pt_xy.y - this._offset.y) / this._scale)};
  }
  this.drawPassepartout = function (context) {
    context.fillStyle = '#101010';
    context.fillRect (0, 0, this._width, this._height);
    context.fillStyle = '#8888FF';
    context.fillRect (this._offset.x, this._offset.y, this._width - 2 * this._offset.x, this._height - 2 * this._offset.y);
  }
  this.suppressLine = function (from, to) {
    return Math.abs (to.b) > this._lat_limit || Math.abs (from.b) > this._lat_limit || Math.abs (to.a - from.a) > Math.PI || Math.abs (to.b - from.b) > Math.PI / 2.0;
  }
}

const projectors = [new EquirectangularProjector (), new OrthographicProjector (), new MercatorProjector, new CylindricProjector];
var projector_counter = 0;
var projector = projectors[projector_counter];

function MouseTracker ()
{
  this.down = false;
  this.button = null;
  this.down_pos = {x: 0, y: 0};
  this.up_pos = {x: 0, y: 0};
  this.rot_mat = I;
  this.catchDown = function (event) {
    let cur_pos = projector.backProjectPoint ({x: event.layerX, y: event.layerY});
    if (!isNaN (cur_pos.a) && !isNaN (cur_pos.b))
    {
      this.down = true;
      this.button = event.button; // store it here as onmousemove may not provide it
      this.down_pos = cur_pos;
      switch (this.button)
      {
        case 0: // left mouse button
          this.rot_mat = map_data1.transformator.rot_mat;
          break;
        case 1: // middle mouse button
          this.rot_mat = map_data2.transformator.rot_mat;
          break;
      }
    }
  }
  this.catchMove = function (event) {
    if (this.down)
    {
      let cur_pos = projector.backProjectPoint ({x: event.layerX, y: event.layerY});
      event.cancelBubble = true;
      event.returnValue = false;
      if (!isNaN (cur_pos.a) && !isNaN (cur_pos.b))
      {
        switch (this.button)
        {
          case 0:
            map_data1.transformator.rot_mat = matMulMat (this.rot_mat, matMulMat (getRotMatX (this.down_pos.b - cur_pos.b), getRotMatY (cur_pos.a - this.down_pos.a)));
            map_data2.transformator.rot_mat = matMulMat (this.rot_mat, matMulMat (getRotMatX (this.down_pos.b - cur_pos.b), getRotMatY (cur_pos.a - this.down_pos.a)));
            break;
          case 1:
            map_data2.transformator.rot_mat = matMulMat (this.rot_mat, matMulMat (getRotMatX (this.down_pos.b - cur_pos.b), getRotMatY (cur_pos.a - this.down_pos.a)));
            break;
        }
        drawPolygons ();
      }
    }
  }
  this.catchWheel = function (event) {
    event.cancelBubble = true;
    event.returnValue = false;
    const a = event.deltaY > 0 ? 1.0 : -1.0;
    if (a > 0)
    {
      map_data1.transformator.rot_mat = matMulMat (map_data1.transformator.rot_mat, getRotMatZ (a * Math.PI / 20.0));
      map_data2.transformator.rot_mat = matMulMat (map_data2.transformator.rot_mat, getRotMatZ (a * Math.PI / 20.0));
    }
    else
    {
      map_data2.transformator.rot_mat = matMulMat (map_data2.transformator.rot_mat, getRotMatZ (a * Math.PI / 20.0));
    }
    map_data1.transformator.transformMapData (map_data1);
    map_data2.transformator.transformMapData (map_data2);
    map_data1.transformator.transformMapData (city_data);
    map_data1.transformator.rot_mat = I;
    map_data2.transformator.rot_mat = I;
    drawPolygons ();
  }
  this.catchUp = function (event) {
    map_data1.transformator.transformMapData (map_data1);
    map_data2.transformator.transformMapData (map_data2);
    map_data1.transformator.transformMapData (city_data);
    map_data1.transformator.rot_mat = I;
    map_data2.transformator.rot_mat = I;
    this.down = false;
    this.button = null;
  }
  this.catchDblClick = function (event) {
    projector_counter += 1;
    projector = projectors[projector_counter % projectors.length];
    drawPolygons ();
  }
}

var mouse_tracker = new MouseTracker ();

function ResizeHandler ()
{
  this.catchResize = function (event) {
    let body = document.getElementsByTagName ("body")[0];
    let style = window.getComputedStyle (body, null);
    const mt = parseFloat (style.marginTop);
    const mb = parseFloat (style.marginBottom);
    const pt = parseFloat (style.paddingTop);
    const pb = parseFloat (style.paddingBottom);
    let html = document.getElementsByTagName ("html")[0];
    let frame = document.getElementById ("frame");
    frame.style.width = (body.clienWidth - 2) + "px";
    frame.style.height = (html.clientHeight - mt - mb - pt - pb - 2) + "px";
    drawPolygons ();
  }
}

var resize_handler = new ResizeHandler ();

function drawPolygon (context, polygon, transformator)
{
  let start_point = {a: Number.MAX_VALUE, b: Number.MAX_VALUE};
  for (const pt_xyz of polygon)
  {
    let pt_ab = xyz2ab (transformator.transformPoint (pt_xyz));
    let pt_xy = projector.projectPoint (pt_ab);
    if (projector.suppressLine (start_point, pt_ab))
    {
      context.moveTo (pt_xy.x, pt_xy.y);
    } 
    else
    {
      context.lineTo (pt_xy.x, pt_xy.y);
    }
    start_point = pt_ab;
  }
}

function drawPolygons ()
{
  if (map_data1.loaded && map_data2.loaded && city_data.loaded)
  {
    let frame = document.getElementById ("frame");
    let map = document.getElementById ("map");
    map.width = frame.clientWidth;
    map.height = frame.clientHeight;
    projector.setWidth (map.width);
    projector.setHeight (map.height);
    let context = map.getContext ("2d");
    projector.drawPassepartout (context);
    context.lineWidth = 1;
    context.strokeStyle = "#CCCCCC";
    context.fillStyle = "rgba(0,128,0,0.5)";
    context.beginPath ();
    for (const polygon of map_data2.polygons)
    {
      drawPolygon (context, polygon, map_data2.transformator);
    }
    context.fill ();
    context.stroke ();
    context.strokeStyle = "#CCCCCC";
    context.fillStyle = "rgba(128,0,0,0.5)";
    context.beginPath ();
    for (const polygon of map_data1.polygons)
    {
      drawPolygon (context, polygon, map_data1.transformator);
    }
    context.fill ();
    context.stroke ();
    context.strokeStyle = "red";
    context.beginPath ();
    for (const polygon of city_data.polygons)
    {
      drawPolygon (context, polygon, map_data1.transformator);
    }
    context.stroke ();
  }
}

window.onload = function ()
{
  loadJsonData ("./ne_110m_countries_red.json", json2MapData, map_data1);
  loadJsonData ("./cities_red.json", json2CityData, city_data);
  let frame = document.getElementById ("frame");
  frame.onmousedown = mouse_tracker.catchDown;
  frame.onmouseup = mouse_tracker.catchUp;
  frame.onmouseleave = mouse_tracker.catchUp;
  frame.onmousemove = mouse_tracker.catchMove;
  frame.onwheel = mouse_tracker.catchWheel;
  frame.ondblclick = mouse_tracker.catchDblClick;
  frame.ontouchstart = mouse_tracker.catchDown;
  frame.ontouchend = mouse_tracker.catchUp;
  frame.ontouchcancel = mouse_tracker.catchUp;
  frame.ontouchmove = mouse_tracker.catchMove;
  window.onresize = resize_handler.catchResize;
}
