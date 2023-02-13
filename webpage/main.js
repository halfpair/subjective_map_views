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

function loadPixelData(src_url, data)
{
  const img = new Image();
  img.src = src_url;
  img.addEventListener("load",
    function()
    {
      const load_canvas = document.createElement("canvas");
      load_canvas.width = img.width;
      load_canvas.height = img.height;
      const load_context = load_canvas.getContext("2d");
      load_context.drawImage(img, 0, 0);
      data.data = load_context.getImageData(0,0, img.width, img.height);
      data.loaded = true;
      resize_handler.catchResize (null);
    });
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

class PixelData
{
  constructor()
  {
    this.loaded = false;
    this.data = null;
    this.transformator = new Transformator();
  }
}

var pixel_data = new PixelData();

class BaseProjector
{
  name = "";
  side_ratio = 1.0;
  draw_width = 128;
  offset = {x: 0, y: 0};
  width = 128;
  height = 64;
  passpartout_polygon = [];
  speedup_level = 1;
  frame_color = '#101010';
  background_color = '#FFFFFF';

  constructor () {}

  setSize (width, height)
  {
    this.width = width;
    this.height = height;

    this.draw_width = width > height * this.side_ratio ? height * this.side_ratio : width;

    this.offset = {x: (width - this.draw_width) / 2.0,
                   y: (height - this.draw_width / this.side_ratio) / 2.0};

    this.passpartout_polygon = [{x: this.offset.x, y: this.offset.y},
                                {x: this.offset.x, y: this.offset.y + this.draw_width / this.side_ratio},
                                {x: this.offset.x + this.draw_width, y: this.offset.y + this.draw_width / this.side_ratio},
                                {x: this.offset.x + this.draw_width, y: this.offset.y},
                                {x: this.offset.x, y: this.offset.y}];
  }

  projectPoint (pt_ab)
  {
    return {x: this.draw_width * (pt_ab.a / Math.PI + 1.0) / 2.0 + this.offset.x,
            y: this.draw_width / this.side_ratio * (0.5 - pt_ab.b / Math.PI) + this.offset.y};
  }

  backProjectPoint (pt_xy)
  {
    return {a: ((pt_xy.x - this.offset.x) * 2.0 / this.draw_width - 1.0) * Math.PI,
            b: (0.5 - (pt_xy.y - this.offset.y) * this.side_ratio / this.draw_width) * Math.PI};
  }

  drawPassepartout (context)
  {
    context.fillStyle = this.frame_color;
    context.fillRect (0, 0, this.width, this.height);
    context.fillStyle = this.background_color;
    context.beginPath ();
    context.moveTo (this.passpartout_polygon[0].x, this.passpartout_polygon[0].y);
    for (let i = 1, n = this.passpartout_polygon.length; i < n; i++)
      context.lineTo (this.passpartout_polygon[i].x, this.passpartout_polygon[i].y);
    context.fill ();
  }

  setSpeedupLevel(level)
  {
    let speedup_level = parseInt(level);
    if (speedup_level < 1)
      this.speedup_level = 1;
    else if (speedup_level > 4)
      this.speedup_level = 4;
    else
      this.speedup_level = speedup_level;
  }

  drawPixelMap(context, image_data)
  {
    let interp_data = new ImageData(this.draw_width, this.draw_width / this.side_ratio);
    let fx = image_data.width / 2.0 / Math.PI;
    let fy = image_data.height / Math.PI;
    for (let y = 0, yn = interp_data.height; y < yn; y=y+this.speedup_level)
    {
      let yo = y * interp_data.width * 4;
      for (let x = 0, xn = interp_data.width; x < xn; x=x+this.speedup_level)
      {
        let pt_ab = projector.backProjectPoint({x: x + projector.offset.x, y: y + projector.offset.y});
        let pt_xyz = ab2xyz(pt_ab);
        pt_xyz = pixel_data.transformator.transformPoint(pt_xyz);
        pt_ab = xyz2ab(pt_xyz);
        let xo = x * 4;
        let xi = parseInt((pt_ab.a + Math.PI) * fx) * 4;
        let yi = parseInt((Math.PI / 2.0 - pt_ab.b) * fy) * image_data.width * 4;
        for (let c = 0; c < 4; c++)
        {
          let v = image_data.data[yi + xi + c];
          for (let ly = 0; ly < this.speedup_level; ly++)
            for (let lx = 0; lx < this.speedup_level; lx++)
              interp_data.data[yo + interp_data.width * 4 * ly + xo + c + 4 * lx] = v;
        }
      }
    }
    context.putImageData(interp_data, this.offset.x, this.offset.y);
  }

  suppressLine (from, to)
  {
    return false;
  }

  getCuttedPolygons (pts_xy, suppressed_lines)
  {
    if (suppressed_lines.length == pts_xy.length - 1)  // nothing to render
      return [];
    
    if (suppressed_lines.length == 0)  // nothing to cut
      return [pts_xy];
    

    function getClosedPolygonCutPointFromInside (pt1, pt2, closed_polygon)
    {
      // for line intersection computation see https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
      let result = {ppp_id: -1, u: 0.0, pt: {x: 0.0, y: 0.0}};
      //for (let i = 0, n = closed_polygon.length - 1; i < n; i++)
      //{
      //  let pt3 = closed_polygon[i];
      //  let pt4 = closed_polygon[i+1];
      //  let divisor = (pt1.x - pt2.x) * (pt3.y - pt4.y) - (pt1.y - pt2.y) * (pt3.x - pt4.x);
      //  if (Math.abs (divisor) > 1.e-12)
      //  {
      //    let t = ((pt1.x - pt3.x) * (pt3.y - pt4.y) - (pt1.y - pt3.y) * (pt3.x - pt4.x)) / divisor;
      //    let u = ((pt1.x - pt3.x) * (pt1.y - pt2.y) - (pt1.y - pt3.y) * (pt1.x - pt2.x)) / divisor;
      //    if (t >= 0.0 && u >= 0.0 && u <= 1.0)
      //    {
      //      result = {ppp_id: i, u: u, pt: {x: pt3.x + u * (pt4.x - pt3.x), y: pt3.y + u * (pt4.y - pt3.y)}};
      //      break;
      //    }
      //  }
      //}
      // avoid spikes in the wrong direction
      //const pt1_pt2_d2 = (pt2.x - pt1.x)**2 + (pt2.y - pt1.y)**2;
      //const pt2_pt_d2 = (result.pt.x - pt2.x)**2 + (result.pt.y - pt2.y)**2;
      //if (pt2_pt_d2 > 100 * pt1_pt2_d2)
      {
        let valid_prj_pts = [];
        for (let i = 0, n = closed_polygon.length - 1; i < n; i++)
        {
          let pt3 = closed_polygon[i];
          let pt4 = closed_polygon[i+1];
          let f1 = pt3.x - pt4.x;
          let f2 = pt4.y - pt3.y;
          let divisor = f1**2 - (pt3.y - pt4.y) * f2;
          if (Math.abs (divisor) > 1.e-12)
          {
            let u = ((pt3.x - pt2.x) * f1 - (pt3.y - pt2.y) * f2) / divisor;
            if (u >= 0.0 && u <= 1.0)
              valid_prj_pts.push ({ppp_id: i, u: u, pt: {x: pt3.x + u * (pt4.x - pt3.x), y: pt3.y + u * (pt4.y - pt3.y)}});
          }
        }
        result = valid_prj_pts.sort (function (a, b) { return ((a.pt.x - pt2.x)**2 + (a.pt.y - pt2.y)**2) - ((b.pt.x - pt2.x)**2 + (b.pt.y - pt2.y)**2); })[0];
      }
      return result;  // should never happen
    }

    function handleSubPolygon (pts, closed_polygon)  // pts must have at least length 2
    {
      let sub_polygon = {}
      sub_polygon.pts = pts;
      let cut_pt = getClosedPolygonCutPointFromInside (sub_polygon.pts[1], sub_polygon.pts[0], closed_polygon);
      sub_polygon.pts.unshift (cut_pt.pt);
      sub_polygon.in_id = cut_pt.ppp_id;
      sub_polygon.in_u = cut_pt.u;
      const l = sub_polygon.pts.length;
      cut_pt = getClosedPolygonCutPointFromInside (sub_polygon.pts[l-2], sub_polygon.pts[l-1], closed_polygon);
      sub_polygon.pts.push (cut_pt.pt);
      sub_polygon.out_id = cut_pt.ppp_id;
      sub_polygon.out_u = cut_pt.u;
      return sub_polygon;
    }

    let sub_polygons = [];
    // handle all parts "inside"
    let first = suppressed_lines[0] + 1;
    for (let i = 1, n = suppressed_lines.length; i < n; i++)
    {
      const suppressed_line = suppressed_lines[i];
      if (suppressed_line + 1 - first > 2)  // at least an angle
        sub_polygons.push (handleSubPolygon (pts_xy.slice (first, suppressed_line + 1), this.passpartout_polygon));
      first = suppressed_line + 1;
    }
    // handle "frame"-part especially
    if (pts_xy.length - (suppressed_lines[suppressed_lines.length - 1] + 1 - suppressed_lines[0]) > 3)
    {
      const last = suppressed_lines[suppressed_lines.length - 1] + 1;
      let render_pts = pts_xy.slice (last);
      let render_pts2 = pts_xy.slice (0, suppressed_lines[0] + 1);
      if (render_pts.length > render_pts2.length && render_pts2.length > 0)
        render_pts.pop ();
      else if (render_pts.length > 0)
        render_pts2.shift ();
      sub_polygons.push (handleSubPolygon (render_pts.concat (render_pts2), this.passpartout_polygon));
    }

    let result = [];
    sub_polygons.sort (function (a, b) { if (a.in_id < b.in_id) return -1;
                                         else if (a.in_id > b.in_id) return 1;
                                         else return a.in_u - b.in_u;});
    let used_ids = [];
    function getAncestor (sub_polygon)
    {
      let ancestors = sub_polygons.map (function (a) {return a.in_id < sub_polygon.out_id || (a.in_id == sub_polygon.out_id && a.in_u < sub_polygon.out_u);});
      let ancestor = ancestors.lastIndexOf (true);
      if (ancestor == -1)
        ancestor = sub_polygons.length - 1;
      if (used_ids.indexOf (ancestor) > -1)
        return;
      used_ids.push (ancestor);
      getAncestor (sub_polygons[ancestor]);
    }
    while (sub_polygons.length > 0)
    {
      used_ids = [0];
      getAncestor (sub_polygons[0]);
      let pts = sub_polygons[0].pts;
      for (let i = 1, n = used_ids.length; i < n; i++)
      {
        for (let j = 0, nj = sub_polygons[used_ids[i-1]].out_id - sub_polygons[used_ids[i]].in_id; j < nj; j++)
        {
          pts.push (this.passpartout_polygon[sub_polygons[used_ids[i-1]].out_id - j]);
        }
        pts = pts.concat (sub_polygons[used_ids[i]].pts);
      }
      result.push (pts);
      used_ids.sort (function (a, b) {return b - a;});
      for (let i = 0, n = used_ids.length; i < n; i++)
      {
        sub_polygons.splice (used_ids[i], 1);
      }
    }

    return result;
  }
}

class EquirectangularProjector extends BaseProjector
{
  constructor ()
  {
    super ();
    this.name = "Equirectangular";
    this.side_ratio = 2.0;
  }

  projectPoint (pt_ab)
  {
    return super.projectPoint (pt_ab);
  }

  backProjectPoint (pt_xy)
  {
    return super.backProjectPoint (pt_xy);
  }

  suppressLine (from, to)
  {
    return Math.abs (to.a - from.a) > Math.PI || Math.abs (to.b - from.b) > Math.PI / 2.0;
  }
}

class OrthographicProjector extends BaseProjector
{
  constructor ()
  {
    super ();
    this.name = "Orthographic";
    this.side_ratio = 1.0;
  }

  projectPoint (pt_ab)
  {
    return {x: this.draw_width / 2.0 * (1.0 + Math.sin (pt_ab.a) * Math.cos (pt_ab.b)) + this.offset.x,
            y: this.draw_width / 2.0 * (1.0 + Math.sin (-pt_ab.b)) + this.offset.y};
  }

  backProjectPoint (pt_xy)
  {
    let b = -Math.asin (2.0 * (pt_xy.y - this.offset.y) / this.draw_width - 1.0);
    return {a: Math.asin ((2.0 * (pt_xy.x - this.offset.x) / this.draw_width - 1.0) / Math.cos (b)),
            b: b};
  }

  drawPassepartout (context)
  {
    context.fillStyle = this.frame_color;
    context.fillRect (0, 0, this.width, this.height);
    context.fillStyle = this.background_color;
    context.beginPath ();
    context.arc (this.width / 2.0, this.height / 2.0, this.draw_width / 2.0, 0, Math.PI * 2.0, true);
    context.fill ();
  }

  suppressLine (from, to)
  {
    let lim = Math.PI / 2.0;
    return Math.abs (to.a) > lim || Math.abs (to.b) > lim || Math.abs (from.a) > lim || Math.abs (from.b) > lim;
  }
}

class MercatorProjector extends BaseProjector
{
  constructor ()
  {
    super ();
    this.name = "Mercator";
    this.side_ratio = 1.0;
    this.lat_limit = Math.asin (Math.tanh (Math.PI / this.side_ratio));
    this.lat_prj_limit = Math.atanh (Math.sin (this.lat_limit));
}

  projectPoint (pt_ab)
  {
    return {x: this.draw_width * (pt_ab.a / Math.PI + 1.0) / 2.0 + this.offset.x,
            y: this.draw_width / this.side_ratio * (1.0 - Math.atanh (Math.sin (pt_ab.b)) / this.lat_prj_limit) / 2.0 + this.offset.y};
  }

  backProjectPoint (pt_xy)
  {
    return {a: ((pt_xy.x - this.offset.x) * 2.0 / this.draw_width - 1.0) * Math.PI,
            b: Math.asin (Math.tanh (this.lat_prj_limit * (1.0 - (pt_xy.y - this.offset.y) / this.draw_width * this.side_ratio * 2.0)))};
  }

  suppressLine (from, to)
  {
    return Math.abs (to.b) > this.lat_limit || Math.abs (from.b) > this.lat_limit || Math.abs (to.a - from.a) > Math.PI || Math.abs (to.b - from.b) > Math.PI / 2.0;
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

const projectors = [new EquirectangularProjector (), new OrthographicProjector (), new MercatorProjector ()]; //, new CylindricProjector];
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
          //this.rot_mat = map_data1.transformator.rot_mat;
          this.rot_mat = pixel_data.transformator.rot_mat;
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
            map_data1.transformator.rot_mat = matMulMat (getRotMatX (this.down_pos.b - cur_pos.b), getRotMatY (cur_pos.a - this.down_pos.a));
            map_data2.transformator.rot_mat = matMulMat (getRotMatX (this.down_pos.b - cur_pos.b), getRotMatY (cur_pos.a - this.down_pos.a));
            pixel_data.transformator.rot_mat = matMulMat(this.rot_mat, matMulMat(getRotMatY (this.down_pos.a - cur_pos.a), getRotMatX (cur_pos.b - this.down_pos.b)));
            break;
          case 1:
            map_data2.transformator.rot_mat = matMulMat (this.rot_mat, matMulMat (getRotMatX (this.down_pos.b - cur_pos.b), getRotMatY (cur_pos.a - this.down_pos.a)));
            break;
        }
        let t0 = performance.now();
        drawPolygons ();
        if (performance.now() - t0 > 200)
          projector.setSpeedupLevel(projector.speedup_level + 1);
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
      pixel_data.transformator.rot_mat = matMulMat(pixel_data.transformator.rot_mat, getRotMatZ(-a * Math.PI / 20.0));
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
    projector.setSpeedupLevel(1);
    drawPolygons();
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
  let pts_ab = polygon.map (function (pt_xyz) { return xyz2ab (transformator.transformPoint (pt_xyz)); });
  let cuts = [];
  for (let i = 0, n = pts_ab.length - 1; i < n; i++)
    if (projector.suppressLine (pts_ab[i], pts_ab[i + 1]))
      cuts.push (i);
  let pts_xy = pts_ab.map (function (pt_ab) { return projector.projectPoint (pt_ab); });
  context.moveTo (pts_xy[0].x, pts_xy[0].y);
  for (let i = 1, n = pts_xy.length; i < n; i++)
  {
    if (cuts.indexOf (i - 1) > -1)
      context.moveTo (pts_xy[i].x, pts_xy[i].y);
    else
      context.lineTo (pts_xy[i].x, pts_xy[i].y);
  }
}

function drawArea (context, polygon, transformator)
{
  let pts_ab = polygon.map (function (pt_xyz) { return xyz2ab (transformator.transformPoint (pt_xyz)); });
  let suppressed_lines = [];
  for (let i = 0, n = pts_ab.length - 1; i < n; i++)
    if (projector.suppressLine (pts_ab[i], pts_ab[i + 1]))
      suppressed_lines.push (i);
  let pts_xy = pts_ab.map (function (pt_ab) { return projector.projectPoint (pt_ab); });
  let sub_polygons = projector.getCuttedPolygons (pts_xy, suppressed_lines);
  for (const sub_polygon of sub_polygons)
  {
    context.moveTo (sub_polygon[0].x, sub_polygon[0].y);
    for (const pt of sub_polygon)
      context.lineTo (pt.x, pt.y);
  }
}

function drawPolygons ()
{
  if (map_data1.loaded && map_data2.loaded && city_data.loaded && pixel_data.loaded)
  {
    let frame = document.getElementById ("frame");
    let map = document.getElementById ("map");
    map.width = frame.clientWidth;
    map.height = frame.clientHeight;
    projector.setSize (map.width, map.height);
    let context = map.getContext ("2d");
    projector.drawPassepartout (context);
    projector.drawPixelMap(context, pixel_data.data);
    context.lineWidth = 1;
    context.strokeStyle = "#CCCCCC";
    //context.fillStyle = "rgba(0,128,0,0.5)";
    //context.beginPath ();
    //for (const polygon of map_data2.polygons)
    //{
    //  drawPolygon (context, polygon, map_data2.transformator);
    //}
    //context.fill ();
    //context.stroke ();
    context.strokeStyle = "#CCCCCC";
    //context.fillStyle = "rgba(128,0,0,0.5)";
    context.beginPath ();
    for (const polygon of map_data1.polygons)
    {
      drawPolygon(context, polygon, map_data1.transformator);
    }
    //context.fill ();
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
  loadPixelData("./map_color.jpg", pixel_data);
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
