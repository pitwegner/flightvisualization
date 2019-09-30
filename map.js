// Constants
const WIDTH = window.innerWidth
const HEIGHT = window.innerHeight
const ZOOM_THRESHOLD = [0.3, 7]
const OVERLAY_MULTIPLIER = 10
const OVERLAY_OFFSET = OVERLAY_MULTIPLIER / 2 - 0.5
const ZOOM_DURATION = 500
const ZOOM_IN_STEP = 2
const ZOOM_OUT_STEP = 1 / ZOOM_IN_STEP
const FILL_COLOR = "#333"
const STROKE_COLOR = "#ccc"
const NODE_COLOR = STROKE_COLOR
const NODE_HOVER_WIDTH = 8
const NODE_WIDTH = 6
const EDGE_HOVER_STROKE = 5
const EDGE_STROKE = 1
const ANIMATION_TIME = 20
let RELATIVE, UNIT, PRICE_RANGE

function setRelativity(relative) {
  RELATIVE = relative
  if (!relative) {
    PRICE_RANGE = data.edges.reduce((accu, edge) => [Math.min(accu[0], edge.price), Math.max(accu[1], edge.price)], [Infinity, 0])
    UNIT = "AUD "
  } else {
    PRICE_RANGE = data.edges.reduce((accu, edge) => [Math.min(accu[0], 1000 * edge.price/edge.distance), Math.max(accu[1], 1000 * edge.price/edge.distance)], [Infinity, 0])
    UNIT = "AUD/km "
  }
}
setRelativity(document.getElementById("btn-toggle-box").checked)
document.getElementById("btn-toggle-box").addEventListener("change", (e) => {
  recolor(e.target.checked)
})

sticky_edges = []

let colorScale = d3.scaleLinear()
  .domain(PRICE_RANGE)
  .range(["#00FF00", "#CC0088"])

function recolor(relative) {
  setRelativity(relative)
  colorScale = d3.scaleLinear()
    .domain(PRICE_RANGE)
    .range(["#00FF00", "#CC0088"])
  g.selectAll(".dashes")
    .attr("stroke", (d) => getColor(d))
  g.selectAll(".edge")
    .attr("stroke", (d) => getColor(d))
  g.selectAll(".edge-overlay")
    .attr("stroke", (d) => getColor(d))
    .attr("opacity", 0.0)
  legend_svg.selectAll(".swatch")
    .attr("stroke-width", 0.0)
  sticky_edges = []
  colorLegend
    .labels((step) => {
    let lower = "0.00"
    let upper = "∞"
    if (step.i !== 0) lower = (PRICE_RANGE[0] + step.i * (PRICE_RANGE[1] - PRICE_RANGE[0]) / step.genLength).toFixed(2)
    if (step.i !== step.genLength - 1) upper = (PRICE_RANGE[0] + (step.i + 1) * (PRICE_RANGE[1] - PRICE_RANGE[0]) / step.genLength).toFixed(2)
    return UNIT + lower + " - " + upper
  })
  legend_svg.select(".colorLegend")
    .call(colorLegend)  
}

function getColor(edge) {
  if (RELATIVE) return colorScale(1000 * edge.price/edge.distance)
  else return colorScale(edge.price)
}

function drawNodeTooltip(node) {
  let bounds = document.getElementById(node.id).getBoundingClientRect()
  d3.select("#map")
    .append("div")
    .attr("class", "caption")
    .style("left", bounds.x + "px")		
    .style("top", bounds.y + "px")
    .html(node.label)
}

function drawEdgeTooltip(edge) {
  d3.select("#map")
    .append("div")
    .attr("class", "caption")
    .style("left", d3.event.pageX + "px")		
    .style("top", d3.event.pageY + "px")
    .html("<table>" +
      "<tr><td colspan=\"2\">Flight from " + data.nodes.find((n) => n.id == edge.source).label + " to " + data.nodes.find((n) => n.id == edge.target).label + "</td></tr>" +
      "<tr><td>Price:</td><td>AUD " + edge.price + "</td></tr>" +
      "<tr><td>Distance:</td><td>" + Math.round(edge.distance / 1000) + " km</td></tr>" +
      "<tr><td>Relative Price:</td><td>" + (edge.price / edge.distance * 1000).toFixed(3) + " AUD/km</td></tr>" +
      "<tr><td>Aircraft Model:</td><td>" + edge.aircraft_model + "</td></tr>" +
      "<tr><td>Motor Model:</td><td>" + edge.motor_model + "</td></tr>" +
      "<tr><td>Airspace Class:</td><td>" + edge.airspace_class + "</td></tr>" +
      "</table>")
}

// Event handlers
const zoom = d3
  .zoom()
  .scaleExtent(ZOOM_THRESHOLD)
  .on("zoom", zoomHandler)

let scale = 1

function zoomHandler() {
  g.attr("transform", d3.event.transform)
  scale = d3.event.transform.k
  g.selectAll(".city").attr("r", NODE_WIDTH / scale)
  d3.selectAll('.caption').remove()
}

function mouseOverNodeHandler(d) {
  let edges = data.edges.filter((edge) => edge.source === d.id)
  edges.map((edge) => {
    d3.select(`#${edge.source}_${edge.target}`).attr("opacity", 1.0)
  })
  let targets = edges.map((edge) => data.nodes.find((node) => node.id === edge.target))
  targets.push(d)
  targets.map((target) => {
    d3.select(`#${target.id}`).attr("r", NODE_HOVER_WIDTH / scale)
    drawNodeTooltip(target)
  })
}

function mouseOutNodeHandler(d) {
  let edges = data.edges.filter((edge) => edge.source === d.id)
  edges.map((edge) => {
    if (!sticky_edges.includes(`${edge.source}_${edge.target}`))
      d3.select(`#${edge.source}_${edge.target}`).attr("opacity", 0.0)
  })
  let targets = edges.map((edge) => data.nodes.find((node) => node.id === edge.target))
  targets.push(d)
  targets.map((target) => d3.select(`#${target.id}`).attr("r", NODE_WIDTH / scale))
  d3.selectAll('.caption').remove()
}

function mouseOverEdgeHandler(d) {
  d3.select(this).attr("opacity", 1.0)
  drawEdgeTooltip(d)
}

function mouseOutEdgeHandler(d) {
  if (!sticky_edges.includes(`${d.source}_${d.target}`))
    d3.select(this).attr("opacity", 0.0)
  d3.select('.caption').remove()
}

function clickToZoom(zoomStep) {
  svg
    .transition()
    .duration(ZOOM_DURATION)
    .call(zoom.scaleBy, zoomStep)
}

d3.select("#btn-zoom-in").on("click", () => clickToZoom(ZOOM_IN_STEP))
d3.select("#btn-zoom-out").on("click", () => clickToZoom(ZOOM_OUT_STEP))

// Prepare SVG container for placing the map and rectangle for pan and zoom.
const svg = d3
.select("#map")
.append("svg")
.attr("width", "100%")
.attr("height", "100%")

const legend_svg = d3
  .select("#map")
  .append("svg")
  .attr("id", "legend")
d3.select("#btn-toggle").append("h3").attr("id", "aircraft_heading").html("Aircraft Model")
d3.select("#btn-toggle").append("h3").attr("id", "engine_heading").html("Engine Model")
const legend2_svg = d3
  .select("#map")
  .append("svg")
  .attr("id", "legend2")
const legend3_svg = d3
  .select("#map")
  .append("svg")
  .attr("id", "legend3")

const g = svg.call(zoom).append("g")

g.append("rect")
  .attr("width", WIDTH * OVERLAY_MULTIPLIER)
  .attr("height", HEIGHT * OVERLAY_MULTIPLIER)
  .attr("transform", `translate(-${WIDTH * OVERLAY_OFFSET},-${HEIGHT * OVERLAY_OFFSET})`)
  .style("fill", "none")
  .style("pointer-events", "all")

// Project GeoJSON from 3D to 2D plane, and focus to Australia
const projection = d3
  .geoMercator()
  .center([133.2, -26.85])
  .scale(1200)
  .translate([WIDTH / 2, HEIGHT / 2])
const path = d3.geoPath().projection(projection)

// Plot the map from geojson source https://geojson-maps.ash.ms/
g.append("g")
  .selectAll(".coast")
  .data(australia.features)
  .enter()
  .append("path")
  .attr("d", path)
  .attr("stroke", STROKE_COLOR)
  .attr("fill", FILL_COLOR)
  .attr("stroke-width", EDGE_STROKE)
  .attr("class", "coast")
  .attr("vector-effect", "non-scaling-stroke")

// Draw Edges as quadratic bezier curves
data.edges = data.edges.map((edge) => {
  const source = data.nodes.find((node) => node.id === edge.source)
  const target = data.nodes.find((node) => node.id === edge.target)
  const p0 = projection([source.location.lat, source.location.lon])
  const p2 = projection([target.location.lat, target.location.lon])
  //const middle = [p0[0]+(p2[0]-p0[0])/2,p0[1]+(p2[1]-p0[1])/2]
  //const length = Math.sqrt((p2[0]-p0[0])*(p2[0]-p0[0])+(p2[1]-p0[1])*(p2[1]-p0[1]))
  //const orth = [p2[1]-p0[1], p0[0]-p2[0]]
  //const p1_dist = [middle[0]+orth[0]/Math.log(length), middle[1]+orth[1]/Math.log(length)]
  const tweaks = {
    'brisbane_darwin': [8, -8],
    'brisbane_cairns': [-8, 8],
    'brisbane_mt_is': [10, -10],
    'brisbane_rockhampton': [-10, 10],
    'hobart_melbourne': [5, -5],
    'launceston_melbource': [-5, 5]
  }
  const p1 = [p0[0] + (tweaks[edge.source + '_' + edge.target] || [0,0])[0], p2[1] + (tweaks[edge.source + '_' + edge.target] || [0,0])[1]]
  edge["bezier_points"] = [p0, p1, p2]
  edge["bezier"] = `M ${p0[0]},${p0[1]} Q ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`
  //const x = 0.5 * (p0[0] + p2[0]) + (p2[0] - p0[0]) + 0.5 * Math.sqrt(3) * (p2[1] - p0[1])
  //const y = 0.5 * (p0[1] + p2[1]) + (p2[1] - p0[1]) + 0.5 * Math.sqrt(3) * (p0[0] - p2[0])
  //edge["bezier"] = `M ${p0[0]},${p0[1]} A ${length} ${length} 0 0 0 ${p2[0]} ${p2[1]}`
  return edge
})

g.append("g")
  .selectAll(".edge")
  .data(data.edges)
  .enter()
  .append("path")
  .attr("class", "edge")
  .attr("d", (d) => {
    return d.bezier
  })
  .attr("stroke", (d) => getColor(d))
  .attr("stroke-width", EDGE_STROKE)
  .attr("fill", "none")
  .attr("vector-effect", "non-scaling-stroke")
/*
g.append("g")
  .selectAll(".dashes")
  .data(data.edges)
  .enter()
  .append("path")
  .attr("class", "dashes")
  .style("stroke-dasharray", ("7, 100"))
  .attr("stroke", (d) => getColor(d))
  .attr("d", (d) => {
    return d.bezier
  })
  .attr("stroke-width", EDGE_HOVER_STROKE)
  .attr("fill", "none")
  .attr("vector-effect", "non-scaling-stroke")
*/
const plane_mapping = {
  'A320-232': plane3,
  'A330-202': plane2,
  'A330-203': plane2,
  'A330-243': plane2,
  'B717-200': plane4,
  'B737-3B7': plane6,
  'B737-476': plane6,
}

const motor_mapping = {
  'CF6-80E142': '#e41a1c',
  'CFM56-3B1': '#377eb8',
  'CFM-56-3': '#4daf4a',
  'V2527-5A': '#984ea3',
  '772B-60': '#ff7f00',
  'Unknown': STROKE_COLOR,
}

g.append("g")
  .selectAll(".edge-overlay")
  .data(data.edges)
  .enter()
  .append("path")
  .attr("class", "edge-overlay")
  .attr("id", (d) => `${d.source}_${d.target}`)
  .attr("d", (d) => {
    return d.bezier
  })
  .attr("stroke", (d) => getColor(d))
  .attr("opacity", 0.0)
  .attr("stroke-width", EDGE_HOVER_STROKE)
  .attr("fill", "none")
  .on("mouseover", mouseOverEdgeHandler)
  .on("mouseout", mouseOutEdgeHandler)
  .attr("vector-effect", "non-scaling-stroke")

function onEnd(context, length){
  d3.select(context).transition()
    .duration(length)
    .attrTween("transform", transition)
    .on("end", function(d){onEnd(context, length)})
    .ease(d3.easeLinear)
}

function bezier(t, p0, p1, p2) {
  return [(1-t)*((1-t)*p0[0] + t*p1[0]) + t*((1-t)*p1[0] + t*p2[0]),
    (1-t)*((1-t)*p0[1] + t*p1[1]) + t*((1-t)*p1[1] + t*p2[1])]
}

function curveLength(p0, p1, p2){
    const v = [2 * (p1[0] - p0[0]), 2 * (p1[1] - p0[1])]
    const w = [p2[0] - 2 * p1[0] + p0[0], p2[1] - 2 * p1[1] + p0[1]]
    const uu = 4 * (w[0] * w[0] + w[1] * w[1])
    if (uu < 0.00001)
        return Math.sqrt((p2[0] - p0[0])*(p2[0] - p0[0]) + (p2[1] -p0[1])*(p2[1] - p0[1]))

    const vv = 4 * (v[0] * w[0] + v[1] * w[1])
    const ww = v[0] * v[0] + v[1] *v [1]

    const t1 = 2 * Math.sqrt(uu * (uu + vv + ww))
    const t2 = 2 * uu + vv
    const t3 = vv * vv - 4 * uu * ww
    const t4 = 2 * Math.sqrt(uu * ww)

    return (t1 * t2 - t3 * Math.log(t2 + t1) - (vv * t4 - t3 * Math.log(vv + t4))) / (8 * Math.pow(uu, 1.5))
}

function dx(path, t){
  return ((1-t) * path.bezier_points[1][0] + t * path.bezier_points[2][0]) - ((1-t) * path.bezier_points[0][0] + t * path.bezier_points[1][0])
}

function dy(path, t){
  return ((1-t) * path.bezier_points[1][1] + t * path.bezier_points[2][1]) - ((1-t) * path.bezier_points[0][1] + t * path.bezier_points[1][1])
}

function speed(path, t){
  const dx = 2 * (path.bezier_points[1][0] + path.bezier_points[0][0] * (t - 1) - 2 * path.bezier_points[1][0] * t + path.bezier_points[2][0] * t)
  const dy = 2 * (path.bezier_points[1][1] + path.bezier_points[0][1] * (t - 1) - 2 * path.bezier_points[1][1] * t + path.bezier_points[2][1] * t)
  return Math.sqrt(dy*dy+dx*dx)
}

function transition(path) {
  return function(t) {
    const s = t * curveLength(...path.bezier_points)
    const h = s / 50
    let v = 0
    for (i = 0; i < 50; i++) {
      const k1 = h / speed(path, v)
      const k2 = h / speed(path, v + k1 / 2)
      const k3 = h / speed(path, v + k2 / 2)
      const k4 = h / speed(path, v + k3)
      v += (k1 + 2 * (k2 + k3) + k4) / 6
    }
    p = bezier(v, ...path.bezier_points)
    return "translate(" + p[0] + "," + p[1] + ") rotate(" + (Math.atan2(dy(path, v), dx(path, v)) * 180 / Math.PI + 35) + ") scale(" + 1/scale + ") translate(-12,-12)";
  }
}

g.append("g")
  .selectAll(".plane")
  .data(data.edges)
  .enter()
  .append("path")
  .attr("class", "plane")
  .attr("d", (d) => plane_mapping[d.aircraft_model])
  .attr("fill", (d) => motor_mapping[d.motor_model])
  .attr("vector-effect", "non-scaling-stroke")
  .transition()
    .duration((d) => 70*curveLength(...d.bezier_points))
    .attrTween("transform", transition)
    .on("end", function(d) {onEnd(this, 70*curveLength(...d.bezier_points))})
    .ease(d3.easeLinear)

// Draw cities
let n = g.append("g")
  .selectAll(".city")
  .data(data.nodes)
  .enter()
  .append("circle")
  .attr("fill", NODE_COLOR)
  .attr("cx", (d) => {
    return projection([d.location.lat, d.location.lon])[0]
  })
  .attr("cy", (d) => {
    return projection([d.location.lat, d.location.lon])[1]
  })
  .attr("r", NODE_WIDTH / scale)
  .attr("class", "city")
  .attr("id", (d) => d.id)
  .on("mouseover", mouseOverNodeHandler)
  .on("mouseout", mouseOutNodeHandler)
  .attr("vector-effect", "non-scaling-stroke")

// Color legend
let colorLegend = d3.legendColor()
  .labels((step) => {
    let lower = "0.00"
    let upper = "∞"
    if (step.i !== 0) lower = (PRICE_RANGE[0] + step.i * (PRICE_RANGE[1] - PRICE_RANGE[0]) / step.genLength).toFixed(2)
    if (step.i !== step.genLength - 1) upper = (PRICE_RANGE[0] + (step.i + 1) * (PRICE_RANGE[1] - PRICE_RANGE[0]) / step.genLength).toFixed(2)
    return UNIT + lower + " - " + upper
  })
  .scale(colorScale)
  .cells(10)
  .shapePadding(0)
  .shapeWidth(50)
  .shapeHeight(20)
  .labelOffset(12)
  .on("cellclick", function (d){
    this.children[0].setAttribute("stroke-width", (parseFloat(this.children[0].getAttribute("stroke-width") || 0) + 3) % (3 * 2))
    this.children[0].setAttribute("stroke", FILL_COLOR)
    const limits = this.children[1].innerHTML.match(/[0-9\.]+/g)
    g.selectAll(".edge-overlay").each(function(e){
      const i = sticky_edges.indexOf(`${e.source}_${e.target}`)
      if (!RELATIVE) {
        if (e.price >= parseFloat(limits[0]) && e.price <= parseFloat(limits[1] || "Infinity")){
          this.setAttribute("opacity", (parseFloat(this.getAttribute("opacity")) + 1.0) % 2)
          if (i < 0) sticky_edges.push(`${e.source}_${e.target}`)
          else sticky_edges.splice(i, 1)
        }
      } else {
        if ((1000 * e.price/e.distance) >= parseFloat(limits[0]) && ((1000 * e.price/e.distance) <= parseFloat(limits[1] || "Infinity"))) {
           this.setAttribute("opacity", (parseFloat(this.getAttribute("opacity")) + 1.0) % 2)
           if (i < 0) sticky_edges.push(`${e.source}_${e.target}`)
           else sticky_edges.splice(i, 1)
        }
      }
    })
  })

const legend = legend_svg.append("g")
  .attr("class", "colorLegend")
  .call(colorLegend)

legend_svg.attr("height", legend.node().getBBox().height + "px")

const planes = [...new Set(Object.keys(plane_mapping).map((plane) => plane.substr(0,4)))]
let planeScale = d3.scaleOrdinal()
  .domain(planes)
  .range(planes.map((plane) => plane_mapping[Object.keys(plane_mapping).find((f) => f.substr(0,4) === plane)]))
let legendPlane = d3.legendSymbol() 
  .scale(planeScale)
  .labels((step) => Object.keys(plane_mapping).filter((f) => f.substr(0,4) === step.generatedLabels[step.i]).join(", "))
const legend2 = legend2_svg.append("g")
  .call(legendPlane)
legend2_svg.attr("height", legend2.node().getBBox().height + "px")

const motors = Object.keys(motor_mapping)
let motorScale = d3.scaleOrdinal()
  .domain(motors)
  .range(motors.map((motor) => motor_mapping[motor]))
let legendMotor = d3.legendColor()
  .shapePadding(0)
  .shapeWidth(50)
  .shapeHeight(20)
  .labelOffset(12)
  .scale(motorScale)
const legend3 = legend3_svg.append("g")
  .call(legendMotor)
legend3_svg.attr("height", legend3.node().getBBox().height + "px")

let dragged = false
let dragPoint
document.getElementById("btn-drag").addEventListener("mousedown", function (e){
  dragged = true
  this.style.cursor = "move"
  dragPoint = [e.clientX - document.getElementById("btn-toggle").getBoundingClientRect().left, e.clientY - document.getElementById("btn-toggle").getBoundingClientRect().top]
})

document.getElementById("btn-drag").addEventListener("mouseup", function (e){
  dragged = false
  this.style.cursor = "grab"
})

document.body.addEventListener("mousemove", function (e){
  if (dragged) {
    document.getElementById("btn-toggle").style.left = e.clientX - dragPoint[0] - 20 + "px"
    document.getElementById("btn-toggle").style.top = e.clientY - dragPoint[1] - 20 + "px"
    document.getElementById("legend").style.left = e.clientX - dragPoint[0] + 7 + "px"
    document.getElementById("legend").style.top = e.clientY - dragPoint[1] + 58 + "px"
    document.getElementById("legend2").style.left = e.clientX - dragPoint[0] + 7 + "px"
    document.getElementById("legend2").style.top = e.clientY - dragPoint[1] + 290 + "px"
    document.getElementById("legend3").style.left = e.clientX - dragPoint[0] + 7 + "px"
    document.getElementById("legend3").style.top = e.clientY - dragPoint[1] + 435 + "px"
  }
})

document.getElementById("btn-drag").addEventListener("touchstart", function (e){
  dragged = true
  this.style.cursor = "move"
  dragPoint = [e.touches[0].clientX - document.getElementById("btn-toggle").getBoundingClientRect().left, e.touches[0].clientY - document.getElementById("btn-toggle").getBoundingClientRect().top]
})

document.getElementById("btn-drag").addEventListener("touchend", function (e){
  dragged = false
  this.style.cursor = "grab"
})

document.body.addEventListener("touchmove", function (e){
  if (dragged) {
    document.getElementById("btn-toggle").style.left = e.touches[0].clientX - dragPoint[0] - 20 + "px"
    document.getElementById("btn-toggle").style.top = e.touches[0].clientY - dragPoint[1] - 20 + "px"
    document.getElementById("legend").style.left = e.touches[0].clientX - dragPoint[0] + 7 + "px"
    document.getElementById("legend").style.top = e.touches[0].clientY - dragPoint[1] + 58 + "px"
    document.getElementById("legend2").style.left = e.touches[0].clientX - dragPoint[0] + 7 + "px"
    document.getElementById("legend2").style.top = e.touches[0].clientY - dragPoint[1] + 290 + "px"
    document.getElementById("legend3").style.left = e.touches[0].clientX - dragPoint[0] + 7 + "px"
    document.getElementById("legend3").style.top = e.touches[0].clientY - dragPoint[1] + 435 + "px"
  }
})

// Handle animation -> move dashed line
function animate(t){
  d3.selectAll(".dashes").style("stroke-dashoffset", -t / ANIMATION_TIME)
}

let t = 0
let last = 0
d3.timer((elapsed) => {
  t = t + (elapsed - last)
  last = elapsed
  animate(t)
})
