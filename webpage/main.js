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

function loadImageData(image_data)
{
  image_data.loaded = false;
  image_data.data = null;
  if (image_data.src.length > 0)
  {
    const img = new Image();
    img.src = image_data.src;
    img.addEventListener("load",
      function()
      {
        const load_canvas = document.createElement("canvas");
        load_canvas.width = img.width;
        load_canvas.height = img.height;
        const load_context = load_canvas.getContext("2d");
        load_context.drawImage(img, 0, 0);
        image_data.data = load_context.getImageData(0,0, img.width, img.height);
        image_data.loaded = true;
        resize_handler.catchResize(null);
      });
  }
  else
  {
    image_data.loaded = true;
  }
  let select_image = document.getElementById("select_image");
  let option = document.createElement("option");
  option.value = image_data.key;
  option.textContent = image_data.name;
  option.selected = image_data.preselected;
  select_image.appendChild(option);
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
  for (const [key, value] of Object.entries(json_data))
    data.data[key] = {a: value[0] * Math.PI / 180.0, b: value[1] * Math.PI / 180.0};

  let beeline_list = document.getElementById("beeline_list");
  for (const key of Object.keys(json_data).sort())
  {
    let option = document.createElement("option");
    option.value = key;
    beeline_list.appendChild(option);
  }
}

function checkCityName(event)
{
  let warning = event.target == document.getElementById("beeline_start") ? document.getElementById("beeline_start_warning") : document.getElementById("beeline_end_warning");
  let old_text = warning.innerText;
  warning.innerText = event.target.value in city_data.data ? "" : "Unknown place";

  if (old_text !== warning.innerText)
    resize_handler.catchResize();
}

function ptDotPt (pt_xyz_1, pt_xyz_2)
{
  return pt_xyz_1.x * pt_xyz_2.x + pt_xyz_1.y * pt_xyz_2.y + pt_xyz_1.z * pt_xyz_2.z;
}

const I = [[1.0, 0.0, 0.0],
           [0.0, 1.0, 0.0],
           [0.0, 0.0, 1.0]];

function matT(mat)
{
  return [[mat[0][0], mat[1][0], mat[2][0]],
          [mat[0][1], mat[1][1], mat[2][1]],
          [mat[0][2], mat[1][2], mat[2][2]]];
}

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

class Transformator
{
  #rot_mat;
  #inv_rot_mat;

  constructor()
  {
    this.#rot_mat = I;
    this.#inv_rot_mat = I;
  }

  setRotMat(rot_mat)
  {
    this.#rot_mat = rot_mat;
    this.#inv_rot_mat = matT(rot_mat);
  }

  getRotMat()
  {
    return this.#rot_mat;
  }

  transformPoint(pt_xyz)
  {
    return matMulPt(this.#rot_mat, pt_xyz);
  }

  transformPointInverse(pt_xyz)
  {
    return matMulPt(this.#inv_rot_mat, pt_xyz);
  }
}

var transformator = new Transformator();

function resetTransformator()
{
  transformator.setRotMat(I);
  resize_handler.catchResize();
}

class MapData
{
  constructor()
  {
    this.loaded = false;
    this.polygons = [];
  }
}

var map_data = new MapData();

var graticule_data = new MapData();

function createGraticuleData()
{
  for (let i = 0, ni = 180; i < ni; i+=15)
  {
    let longitude = [];
    let latitude = [];
    for (let j = 0, nj = 360; j <= nj; j++)
    {
      longitude.push(ab2xyz({a: i * Math.PI / 180.0, b: j * Math.PI / 180.0}));
      latitude.push(ab2xyz({a: j * Math.PI / 180.0, b: (i - 90) * Math.PI / 180.0}));
    }
    graticule_data.polygons.push(longitude);
    if (i != 0)
      graticule_data.polygons.push(latitude);
  }
  graticule_data.loaded = true;
}

var distance_data = new MapData();

function createDistanceData()
{
  for (let i = 9, ni = 180; i < ni; i+=9)
  {
    let ring = [];
    let a = i * Math.PI / 180.0;
    for (let j = 0, nj = 360; j <= nj; j++)
    {
      b = j * Math.PI / 180.0;
      ring.push({x: Math.sin(a) * Math.cos(b), y: Math.sin(a) * Math.sin(b), z: Math.cos(a)});
    }
    distance_data.polygons.push(ring);
  }
  distance_data.loaded = true;
}

var image_datas = [{loaded: false, data: null, key: "none", name: "None", src: "", preselected: false},
                   {loaded: false, data: null, key: "base", name: "Base", src: "./map_base.jpg", preselected: false},
                   {loaded: false, data: null, key: "color", name: "Color", src: "./map_color.jpg", preselected: true},
                   {loaded: false, data: null, key: "shape", name: "Shape", src: "./map_shape.png", preselected: false}];

class BaseProjector
{
  key = "";
  name = "";
  preselected = false;
  side_ratio = 1.0;
  draw_width = 128;
  offset = {x: 0, y: 0};
  width = 128;
  height = 64;
  speedup_level = 1;
  frame_color = "#101010";
  background_color = "#FFFFFF";

  constructor() {}

  setSize(width, height)
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

  projectPoint(pt_ab)
  {
    return {x: this.draw_width * (pt_ab.a / Math.PI + 1.0) / 2.0 + this.offset.x,
            y: this.draw_width / this.side_ratio * (0.5 - pt_ab.b / Math.PI) + this.offset.y};
  }

  backProjectPoint(pt_xy)
  {
    return {a: ((pt_xy.x - this.offset.x) * 2.0 / this.draw_width - 1.0) * Math.PI,
            b: (0.5 - (pt_xy.y - this.offset.y) * this.side_ratio / this.draw_width) * Math.PI};
  }

  drawPassepartout(context)
  {
    context.fillStyle = this.frame_color;
    context.fillRect(0, 0, this.width, this.height);
    context.fillStyle = this.background_color;
    context.fillRect(this.offset.x, this.offset.y, this.draw_width, this.draw_width / this.side_ratio);
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
    if (image_data === null)
      return;
    let bgclr = [parseInt(this.frame_color.substr(1, 2), 16),
                 parseInt(this.frame_color.substr(3, 2), 16),
                 parseInt(this.frame_color.substr(5, 2), 16),
                 255];
    let interp_data = new ImageData(this.draw_width, this.draw_width / this.side_ratio);
    let fx = image_data.width / 2.0 / Math.PI;
    let fy = image_data.height / Math.PI;
    for (let y = 0, yn = interp_data.height; y < yn; y += this.speedup_level)
    {
      let yo = y * interp_data.width * 4;
      for (let x = 0, xn = interp_data.width; x < xn; x += this.speedup_level)
      {
        let xo = x * 4;
        let pt_ab = projector.backProjectPoint({x: x + projector.offset.x, y: y + projector.offset.y});
        let is_invalid = isNaN(pt_ab.a) || isNaN(pt_ab.b);
        let xi = 0, yi = 0;
        if (!is_invalid)
        {
          let pt_xyz = ab2xyz(pt_ab);
          pt_xyz = transformator.transformPointInverse(pt_xyz);
          pt_ab = xyz2ab(pt_xyz);
          xi = parseInt((pt_ab.a + Math.PI) * fx) * 4;
          yi = parseInt((Math.PI / 2.0 - pt_ab.b) * fy) * image_data.width * 4;
        }
        for (let c = 0; c < 4; c++)
        {
          let v = is_invalid ? bgclr[c] : image_data.data[yi + xi + c];
          for (let ly = 0; ly < this.speedup_level; ly++)
            for (let lx = 0; lx < this.speedup_level; lx++)
              interp_data.data[yo + interp_data.width * 4 * ly + xo + c + 4 * lx] = v;
        }
      }
    }
    context.putImageData(interp_data, this.offset.x, this.offset.y);
  }

  suppressLine(from, to)
  {
    return false;
  }
}

class EquirectangularProjector extends BaseProjector
{
  constructor()
  {
    super();
    this.key = "equirect";
    this.name = "Equirectangular";
    this.preselected = true;
    this.side_ratio = 2.0;
  }

  projectPoint(pt_ab)
  {
    return super.projectPoint(pt_ab);
  }

  backProjectPoint(pt_xy)
  {
    return super.backProjectPoint(pt_xy);
  }

  suppressLine(from, to)
  {
    return Math.abs(to.a - from.a) > Math.PI || Math.abs(to.b - from.b) > Math.PI / 2.0;
  }
}

class OrthographicProjector extends BaseProjector
{
  constructor()
  {
    super();
    this.key = "ortho";
    this.name = "Orthographic";
    this.side_ratio = 1.0;
  }

  projectPoint(pt_ab)
  {
    return {x: this.draw_width / 2.0 * (1.0 + Math.sin(pt_ab.a) * Math.cos(pt_ab.b)) + this.offset.x,
            y: this.draw_width / 2.0 * (1.0 + Math.sin(-pt_ab.b)) + this.offset.y};
  }

  backProjectPoint(pt_xy)
  {
    let b = -Math.asin(2.0 * (pt_xy.y - this.offset.y) / this.draw_width - 1.0);
    return {a: Math.asin((2.0 * (pt_xy.x - this.offset.x) / this.draw_width - 1.0) / Math.cos(b)),
            b: b};
  }

  drawPassepartout(context)
  {
    context.fillStyle = this.frame_color;
    context.fillRect(0, 0, this.width, this.height);
    context.fillStyle = this.background_color;
    context.beginPath();
    context.arc(this.width / 2.0, this.height / 2.0, this.draw_width / 2.0, 0, Math.PI * 2.0, true);
    context.fill();
  }

  suppressLine(from, to)
  {
    let lim = Math.PI / 2.0;
    return Math.abs(to.a) > lim || Math.abs(to.b) > lim || Math.abs(from.a) > lim || Math.abs(from.b) > lim;
  }
}

class MercatorProjector extends BaseProjector
{
  constructor()
  {
    super();
    this.key = "mercator";
    this.name = "Mercator";
    this.side_ratio = 1.0;
    this.lat_limit = Math.asin (Math.tanh(Math.PI / this.side_ratio));
    this.lat_prj_limit = Math.atanh (Math.sin(this.lat_limit));
}

  projectPoint(pt_ab)
  {
    return {x: this.draw_width * (pt_ab.a / Math.PI + 1.0) / 2.0 + this.offset.x,
            y: this.draw_width / this.side_ratio * (1.0 - Math.atanh(Math.sin(pt_ab.b)) / this.lat_prj_limit) / 2.0 + this.offset.y};
  }

  backProjectPoint(pt_xy)
  {
    return {a: ((pt_xy.x - this.offset.x) * 2.0 / this.draw_width - 1.0) * Math.PI,
            b: Math.asin(Math.tanh(this.lat_prj_limit * (1.0 - (pt_xy.y - this.offset.y) / this.draw_width * this.side_ratio * 2.0)))};
  }

  suppressLine(from, to)
  {
    return Math.abs(to.b) > this.lat_limit || Math.abs(from.b) > this.lat_limit || Math.abs(to.a - from.a) > Math.PI || Math.abs(to.b - from.b) > Math.PI / 2.0;
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

const projectors = [new EquirectangularProjector(), new OrthographicProjector(), new MercatorProjector()]; //, new CylindricProjector];
var projector = projectors.filter(function(prj){return prj.preselected;})[0];

function MouseTracker ()
{
  this.down = false;
  this.rotation = false;
  this.down_pos = {x: 0, y: 0};
  this.touch_pos2 = {x: 0, y: 0};
  this.rot_mat = I;

  this.catchDown = function(event)
  {
    this.rot_mat = transformator.getRotMat();
    if (event.button === 0)
    {
      let cur_pos = projector.backProjectPoint({x: event.layerX, y: event.layerY});
      if (!isNaN(cur_pos.a) && !isNaN(cur_pos.b))
      {
        this.down = true;
        this.down_pos = cur_pos;
      }
    }
    else if (event.touches !== undefined)
    {
      let cur_pos = projector.backProjectPoint({x: event.touches.item(0).clientX, y: event.touches.item(0).clientY});
      if (!isNaN(cur_pos.a) && !isNaN(cur_pos.b))
      {
        this.down = true;
        this.down_pos = cur_pos;
        if (event.touches.length == 2)
        {
          this.rotation = true;
          this.down_pos = event.touches.item(0);
          this.touch_pos2 = event.touches.item(1);
        }
      }
    }
  }

  this.catchMove = function(event)
  {
    if (this.down)
    {
      if (this.rotation)
      {
        let touch_events = event.touches;
        event.cancelBubble = true;
        event.returnValue = false;
        if (touch_events !== undefined && touch_events.length == 2)
        {
          let down_pos_ = {}, touch_pos2_ = {};
          if (touch_events.item(0).identifier === this.down_pos.identifier)
          {
            down_pos_ = touch_events.item(0);
            touch_pos2_ = touch_events.item(1);
          }
          else
          {
            down_pos_ = touch_events.item(1);
            touch_pos2_ = touch_events.item(0);
          }
          let v1 = {x: this.touch_pos2.clientX - this.down_pos.clientX, y: this.touch_pos2.clientY - this.down_pos.clientY};
          let v2 = {x: touch_pos2_.clientX - down_pos_.clientX, y: touch_pos2_.clientY - down_pos_.clientY};
          let angle = Math.acos((v1.x * v2.x + v1.y * v2.y) / (Math.sqrt(v1.x**2 + v1.y**2) * Math.sqrt(v2.x**2 + v2.y**2)));
          angle *= v1.x * v2.y - v1.y * v2.x < 0.0 ? -1.0 : 1.0;
          transformator.setRotMat(matMulMat(getRotMatZ(-angle), this.rot_mat));
        }
      }
      else
      {
        let cur_pos = event.touches === undefined ? projector.backProjectPoint({x: event.layerX, y: event.layerY}) : projector.backProjectPoint({x: event.touches.item(0).clientX, y: event.touches.item(0).clientY});
        event.cancelBubble = true;
        event.returnValue = false;
        if (!isNaN (cur_pos.a) && !isNaN (cur_pos.b))
        {
          transformator.setRotMat(matMulMat(matMulMat(getRotMatX(this.down_pos.b - cur_pos.b), getRotMatY(cur_pos.a - this.down_pos.a)), this.rot_mat));
        }
      }
      let t0 = performance.now();
      drawPolygons ();
      if (performance.now() - t0 > 200)
        projector.setSpeedupLevel(projector.speedup_level + 1);
    }
  }

  this.catchWheel = function (event) {
    event.cancelBubble = true;
    event.returnValue = false;
    const a = event.deltaY > 0 ? 1.0 : -1.0;
    transformator.setRotMat(matMulMat(getRotMatZ(a * Math.PI / 20.0), transformator.getRotMat()));
    drawPolygons ();
  }

  this.catchUp = function (event)
  {
    this.down = false;
    this.rotation = false;
    projector.setSpeedupLevel(1);
    drawPolygons();
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

function drawPolygon (context, polygon)
{
  let pts_ab = polygon.map (function (pt_xyz) { return xyz2ab (transformator.transformPoint(pt_xyz)); });
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

function drawPolygons ()
{
  if (map_data.loaded && graticule_data.loaded && city_data.loaded && distance_data.loaded && image_datas.every(function(image_data){return image_data.loaded;}))
  {
    let frame = document.getElementById ("frame");
    let map = document.getElementById ("map");
    map.width = frame.clientWidth;
    map.height = frame.clientHeight;
    let select_projection = document.getElementById("select_projection");
    projector = projectors.filter(function(prj){return prj.key == select_projection.value;})[0];
    projector.setSize (map.width, map.height);
    let context = map.getContext ("2d");
    projector.drawPassepartout (context);
    
    let select_image = document.getElementById("select_image");
    projector.drawPixelMap(context, image_datas.filter(function(image_data){return image_data.key == select_image.value;})[0].data);

    let graticule = document.getElementById("graticule");
    if (graticule.checked)
    {
      context.lineWidth = 0.5;
      let color_graticule = document.getElementById("color_graticule");
      context.strokeStyle = color_graticule.value;
      context.beginPath ();
      for (const polygon of graticule_data.polygons)
        drawPolygon(context, polygon);
      context.stroke ();
    }

    let boundaries = document.getElementById("boundaries");
    if (boundaries.checked)
    {
      context.lineWidth = 1;
      let color_boundaries = document.getElementById("color_boundaries");
      context.strokeStyle = color_boundaries.value;
      context.beginPath ();
      for (const polygon of map_data.polygons)
        drawPolygon(context, polygon);
      context.stroke ();
    }

    let distances = document.getElementById("distances");
    let beeline_start = document.getElementById("beeline_start");
    if (distances.checked && beeline_start.value in city_data.data)
    {
      context.lineWidth = 0.5;
      let color_distances = document.getElementById("color_distances");
      context.strokeStyle = color_distances.value;
      let city_coord = city_data.data[beeline_start.value];
      let city_trafo = new Transformator();
      city_trafo.setRotMat(matMulMat(getRotMatY(city_coord.a), getRotMatX(-city_coord.b)));
      context.beginPath();
      for (const polygon of distance_data.polygons)
      {
        let trafo_poly = polygon.map(function(pt_xyz){ return city_trafo.transformPoint(pt_xyz); });
        drawPolygon(context, trafo_poly);
      }
      context.stroke();
    }

    let beeline_end = document.getElementById("beeline_end");
    if (beeline_start.value in city_data.data && beeline_end.value in city_data.data)
    {
      let pt1 = ab2xyz(city_data.data[beeline_start.value]);
      let pt2 = ab2xyz(city_data.data[beeline_end.value]);
      let dot = ptDotPt(pt1, pt2);
      let phi = Math.acos(dot);
      let sphi = Math.sin(phi);
      let pt_h = {x: (pt2.x - pt1.x * dot) / sphi,
                  y: (pt2.y - pt1.y * dot) / sphi,
                  z: (pt2.z - pt1.z * dot) / sphi};
      let step_width = Math.PI / 180.0;
      let polygon = [];
      for (let beta = 0.0; beta <= phi; beta += step_width)
      {
        let cbeta = Math.cos(beta);
        let sbeta = Math.sin(beta);
        polygon.push({x: pt1.x * cbeta + pt_h.x * sbeta,
                      y: pt1.y * cbeta + pt_h.y * sbeta,
                      z: pt1.z * cbeta + pt_h.z * sbeta});
      }
      context.lineWidth = 1.0;
      let color_beeline = document.getElementById("color_beeline");
      context.strokeStyle = color_beeline.value;
      context.beginPath ();
      drawPolygon(context, polygon);
      context.stroke ();
    }
  }
}

window.onload = function()
{
  loadJsonData("./ne_110m_countries_red.json", json2MapData, map_data);
  loadJsonData("./cities_red.json", json2CityData, city_data);
  createGraticuleData();
  createDistanceData();
  image_datas.forEach(function(image_data){loadImageData(image_data)});

  let select_projection = document.getElementById("select_projection");
  for (const projector of projectors)
  {
    let option = document.createElement("option");
    option.value = projector.key;
    option.textContent = projector.name;
    option.selected = projector.preselected;
    select_projection.appendChild(option);
  }

  let frame = document.getElementById("frame");
  frame.onmousedown = mouse_tracker.catchDown;
  frame.onmouseup = mouse_tracker.catchUp;
  frame.onmouseleave = mouse_tracker.catchUp;
  frame.onmousemove = mouse_tracker.catchMove;
  frame.onwheel = mouse_tracker.catchWheel;
  frame.ontouchstart = mouse_tracker.catchDown;
  frame.ontouchend = mouse_tracker.catchUp;
  frame.ontouchcancel = mouse_tracker.catchUp;
  frame.ontouchmove = mouse_tracker.catchMove;
  window.onresize = resize_handler.catchResize;
  let select_image = document.getElementById("select_image");
  select_image.onchange = resize_handler.catchResize;
  let boundaries = document.getElementById("boundaries");
  boundaries.onchange = resize_handler.catchResize;
  let color_boundaries = document.getElementById("color_boundaries");
  color_boundaries.onchange = resize_handler.catchResize;
  let graticule = document.getElementById("graticule");
  graticule.onchange = resize_handler.catchResize;
  let color_graticule = document.getElementById("color_graticule");
  color_graticule.onchange = resize_handler.catchResize;
  let distances = document.getElementById("distances");
  distances.onchange = resize_handler.catchResize;
  let color_distances = document.getElementById("color_distances");
  color_distances.onchange = resize_handler.catchResize;
  let beeline_start = document.getElementById("beeline_start");
  beeline_start.oninput = checkCityName;
  let beeline_end = document.getElementById("beeline_end");
  beeline_end.oninput = checkCityName;
  let color_beeline = document.getElementById("color_beeline");
  color_beeline.onchange = resize_handler.catchResize;
  let reset_trafo = document.getElementById("reset_trafo");
  reset_trafo.onclick = resetTransformator;
  select_projection.onchange = resize_handler.catchResize;
}
