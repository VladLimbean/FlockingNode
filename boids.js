// author:  boid with boundaries by aadebdeb https://www.openprocessing.org/user/51764
function boidProcess(processing) {
  
  // process variables
  var SEPARATION_RANGE   = 10.0;
  var ALIGNMENT_RANGE    = 10.0;
  var COHESION_RANGE     = 15.0;
  var SEPARATION_STRENGH = 55.0;
  var ALIGNMENT_STRENGH  = 0.11;
  var COHESION_STRENGH   = 0.11;
  
  var BOUNDARY_SEPARATION_RANGE    = 128.0;
  var BOUNDARY_SEPARATION_STRENGTH = 255.0;
  
  var MAX_VELOCITY = 50.0;
  
  var N = 1200; // number of boids
  var positions;
  var velocities;
  var forces;
  
  var gridBucket;
  var boundaryBucket;
  var boundaries;
  var maxRange;
  var prevMillis = 0.0;
  var TWO_PI;
  var height;
  var width;

  // canvas
  var canvas_width  = 640;
  var canvas_height = 640;
  // Randomized circle variables
  var C_max_radius = 55;
  var C1;
  var C2;
  //initial positions and radius
  var x1 = processing.random(100, 540);
  var y1 = processing.random(100, 540);
  var x2 = processing.random(100, 540);
  var y2 = processing.random(100, 540);

  var targetRad1 = processing.ceil(processing.random(C_max_radius));
  var targetRad2 = processing.ceil(processing.random(C_max_radius));

  var interval_step = 15000; //milliseconds
  var previous_step = 0;
  
  // init
  function setup() {
    console.log('setting up canvas');
    processing.size(canvas_width, canvas_height);
    processing.frameRate(30);
    // storing processing instance variables and constants
    TWO_PI = processing.TWO_PI;
    height = processing.height;
    width  = processing.width;
    initialize();
  }
  
  function initialize() {
    console.log('initializing grid bucket');
    createBoundaryBucket();
    positions = new Array(N);
    velocities = new Array(N);
    forces = new Array(N);
    for (var i = 0; i < N; i++) {
      positions[i] = getInitialPosition();
      velocities[i] = randomInCircle();
      forces[i] = new p5.Vector(0, 0);
    }
    
    maxRange = processing.max([SEPARATION_RANGE, ALIGNMENT_RANGE, COHESION_RANGE]);
    createGridBucket();
  }

  function draw() {
    processing.render();
    processing.update();
  }

  function render() {
    processing.background(255);
    processing.fill(150);
    for (var i = 0; i < N; i++) {
      var pos = positions[i];
      processing.ellipse(pos.x, pos.y, 5, 5); 
    }
    boundaries.forEach(function(boundary) {
      if (boundary.isCircleBoundary) {
        processing.ellipse(boundary.center.x, boundary.center.y, boundary.radius * 2.0, boundary.radius * 2.0);
      }
    });
  }

  function update() {
    // Vlad's mod
    __reroll();
    modifyCircles();
    //
    updateGridBucket();
    calcSeparation();
    calcAlignment();
    calcCohesion();
    calcBoundarySeparation();
    move();
    resolveBoundary();
  }

  // Processing overrides
  processing.setup = setup;
  processing.draw = draw;
  processing.render = render;
  processing.update = update;
  
  function getInitialPosition() {
    while(true) {
      var p = new p5.Vector(processing.random(width), processing.random(height));
      var isAvailable = boundaries.every(function(boundary) {
        if (boundary.isCircleBoundary) {
          return p.dist(boundary.center) >= boundary.radius;
        } else {
          return true;
        }
      });
      if (isAvailable) return p;
    }
  }
  
  function createGridBucket() {
    var x = processing.ceil(width / maxRange) + 2;
    var y = processing.ceil(height / maxRange) + 2;
    gridBucket = new Array(x);
    for (var xi = 0; xi < x; xi++) {
      gridBucket[xi] = new Array(y);
      for (var yi = 0; yi < y; yi++) {
        gridBucket[xi][yi] = [];
      }
    }
  }
  
  function createBoundaryBucket() {
    boundaries = [
      { // left wall
        calcDistance: function(p) {return p.x;},
        calcNormal: function(p) {return new p5.Vector(1.0, 0.0);}
      }, { // right wall
        calcDistance: function(p) {return processing.max(width - p.x, 0.0);},
        calcNormal: function(p) {return new p5.Vector(-1.0, 0.0);}
      }, { // top wall
        calcDistance: function(p) {return p.y;},
        calcNormal: function(p) {return new p5.Vector(0.0, 1.0);}
      }, { // bottom wall
        calcDistance: function(p) {return processing.max(height - p.y, 0.0);},
        calcNormal: function(p) {return new p5.Vector(0.0, -1.0);}
      },
      C1 = new CircleBoundary(new p5.Vector(x1, y1), C_max_radius),
      C2 = new CircleBoundary(new p5.Vector(x2, y2), C_max_radius)
    ];
    
    var x = processing.ceil(width / BOUNDARY_SEPARATION_RANGE) + 2;
    var y = processing.ceil(height / BOUNDARY_SEPARATION_RANGE) + 2;
    boundaryBucket = new Array(x);
    for (var xi = 0; xi < x; xi++) {
      boundaryBucket[xi] = new Array(y);
      for (var yi = 0; yi < y; yi++) {
        boundaryBucket[xi][yi] = [];
        if (xi === 0 || xi === x - 1 || yi === 0 || yi === y - 1) continue;
        boundaries.forEach(function(boundary) {
          var d = processing.min([
            boundary.calcDistance(getBoundaryBucketPosition({x: xi, y: yi})),
            boundary.calcDistance(getBoundaryBucketPosition({x: xi + 1, y: yi})),
            boundary.calcDistance(getBoundaryBucketPosition({x: xi, y: yi + 1})),
            boundary.calcDistance(getBoundaryBucketPosition({x: xi + 1, y: yi + 1}))
          ]);
          if (d < BOUNDARY_SEPARATION_RANGE) {
            boundaryBucket[xi][yi].push(boundary);
          }
        });
      }
    }
  }
  
  function getBoundaryBucketPosition(idx) {
    return new p5.Vector(
      (idx.x - 1) * BOUNDARY_SEPARATION_RANGE,
      (idx.y - 1) * BOUNDARY_SEPARATION_RANGE
    );
  }
  
  function randomInCircle() {
    var r = processing.random();
    var a = processing.random(TWO_PI);
    return new p5.Vector(r * processing.cos(a), r * processing.sin(a));
  }
  
  function updateGridBucket() {
    clearGridBucket();
    for (var i = 0; i < N; i++) {
      var bucket = getBucketIdx(i);
      gridBucket[bucket.x][bucket.y].push(i);
    } 
  }
  
  function clearGridBucket() {
    for (var xi = 0; xi < gridBucket.length; xi++) {
      for (var yi = 0; yi < gridBucket[xi].length; yi++) {
        gridBucket[xi][yi] = [];
      }
    }
  }
  
  function getBucketIdx(idx) {
    return {
      x: processing.floor(positions[idx].x / maxRange) + 1,
      y: processing.floor(positions[idx].y / maxRange) + 1
    };
  }
  
  function getBoundaryBucketIdx(idx) {
    return {
      x: processing.floor(positions[idx].x / BOUNDARY_SEPARATION_RANGE) + 1,
      y: processing.floor(positions[idx].y / BOUNDARY_SEPARATION_RANGE) + 1
    };
  }
  
  function weight(dist, maxDist) {
    return dist < maxDist ? 1.0 - (dist / maxDist) : 0.0;
  }
  
  function calcSeparation() {
    for (var i = 0; i < N; i++) {
      var posi = positions[i];
      var force = new p5.Vector(0.0, 0.0);
      var bucket = getBucketIdx(i);
      for (var xi = bucket.x - 1; xi <= bucket.x + 1; xi++) {
        for (var yi = bucket.y - 1; yi <= bucket.y + 1; yi++) {
          gridBucket[xi][yi].forEach(function(j) {
            if (i === j) return;
            var posj = positions[j];
            var d = posi.dist(posj);
            var w = weight(d, SEPARATION_RANGE);
            if (w <= 0.0) return;
            force.add(p5.Vector.sub(posi, posj).normalize().mult(w));
          });
        }
      }
      forces[i].add(force.mult(SEPARATION_STRENGH));
    }
  }
  
  function calcAlignment() {
    for (var i = 0; i < N; i++) 
    {
      var posi = positions[i];
      var sumW = 0;
      var sumVel = new p5.Vector(0.0, 0.0);
      var bucket = getBucketIdx(i);

      for (var xi = bucket.x - 1; xi <= bucket.x + 1; xi++) 
      {
        for (var yi = bucket.y - 1; yi <= bucket.y + 1; yi++) 
        {
          gridBucket[xi][yi].forEach(function(j) {
            if (i === j) return;
            var posj = positions[j];
            var d = posi.dist(posj);
            var w = weight(d, ALIGNMENT_RANGE);
            if (w <= 0.0) return;
            sumW = w;
            sumVel.add(velocities[j].copy().mult(w));
          });
        }
      }
      if (sumW < 0.001) continue;
      sumVel.div(sumW);
      var force = p5.Vector.sub(sumVel, velocities[i]);
      forces[i].add(force.mult(ALIGNMENT_STRENGH));
    }
  }
  
  function calcCohesion() {
    for (var i = 0; i < N; i++) {
      var posi = positions[i];
      var force = new p5.Vector(0.0, 0.0);
      var bucket = getBucketIdx(i);

      for (var xi = bucket.x - 1; xi <= bucket.x + 1; xi++) {
        for (var yi = bucket.y - 1; yi <= bucket.y + 1; yi++) {
          gridBucket[xi][yi].forEach(function(j) {
            if (i === j) return;
            var posj = positions[j];
            var d = posi.dist(posj);
            var w = weight(d, COHESION_RANGE);
            if (w <= 0.0) return;
            force.add(p5.Vector.sub(posj, posi).normalize().mult(w));
          });
        }
      }
      forces[i].add(force.mult(COHESION_STRENGH));
    }
  }
  
  function calcBoundarySeparation() {
    for (var i = 0; i < N; i++) {
      var posi = positions[i];
      var force = new p5.Vector(0.0, 0.0);
      var bucket = getBoundaryBucketIdx(i);
      var checkedBoundaries = [];

      for (var xi = bucket.x - 1; xi <= bucket.x + 1; xi++) {
        for (var yi = bucket.y - 1; yi <= bucket.y + 1; yi++) {
          boundaryBucket[xi][yi].forEach(function(boundary) {
            if (checkedBoundaries.some(function(checked) {checked === boundary;})) return;
            checkedBoundaries.push(boundary);
            var d = boundary.calcDistance(posi);
            var w = weight(d, BOUNDARY_SEPARATION_RANGE);
            if (w <= 0.0) return;
            force.add(boundary.calcNormal(posi).mult(w));
          });
        }
      }
      forces[i].add(force.mult(BOUNDARY_SEPARATION_STRENGTH));
    }
  }

  function __reroll(){
    let millis = processing.millis();
    if (millis - previous_step > interval_step ) {
      console.log('resetting targets');
      targetRad1 = processing.ceil(processing.random(C_max_radius));
      targetRad2 = processing.ceil(processing.random(C_max_radius));

      x1 = processing.random(100, 540);
      x2 = processing.random(100, 540);
      y1 = processing.random(100, 540);
      y2 = processing.random(100, 540);

      previous_step = processing.millis();
    }
  }

  /**
   * This function modifies the diameter and position of two previously static
   * circle boundary objects.
   * 
   * They are referenced as C1, C2 respectively
   */
  function modifyCircles()
  {
    changeRadius(C1, targetRad1);
    changeRadius(C2, targetRad2);
    changePosition(C1, x1, y1);
    changePosition(C2, x2, y2);

  }

  function changePosition(CircleBoundaryObject, targetX, targetY) {
    let currentX = CircleBoundaryObject.center.x;
    let currentY = CircleBoundaryObject.center.y;

    if (processing.abs(currentX - targetX) > 0.01)
    {
      CircleBoundaryObject.center.x += (targetX - currentX) * 0.05;
    }
    if (processing.abs(currentY - targetY) > 0.01)
    {
      CircleBoundaryObject.center.y += (targetY - currentY) * 0.05;
    }
  }

  function changeRadius(CircleBoundaryObject, targetRad) 
  { 
    let currentRadius = CircleBoundaryObject.radius;
    let ascend = targetRad > currentRadius;

    if (processing.abs(CircleBoundaryObject.radius - targetRad) > 0.01)
    {
      currentRadius = CircleBoundaryObject.radius;
      
      if (ascend) {
        CircleBoundaryObject.radius = CircleBoundaryObject.radius + (targetRad - currentRadius) * 0.05;  
      } 
      else {
        CircleBoundaryObject.radius = CircleBoundaryObject.radius - (currentRadius - targetRad) * 0.05;
      }
    }
  }
  
  function move() {
    var currentMillis = processing.millis();
    var dt = processing.min((currentMillis - prevMillis) * 0.001, 0.2);
    for (var i = 0; i < N; i++) {
      velocities[i].add(p5.Vector.mult(forces[i], dt));
      velocities[i].limit(MAX_VELOCITY);
      positions[i].add(p5.Vector.mult(velocities[i], dt));
      forces[i].set(0.0, 0.0);
    }

    prevMillis = currentMillis;
  }
  
  function resolveBoundary() {
    for (var i = 0; i < N; i++) {
      var pos = positions[i];
      var vel = velocities[i];
      if (pos.x < 0.0) {
        vel.x *= -1;
        pos.x = 0.0;
      }
      if (pos.x >= width) {
        vel.x *= -1;
        pos.x = width - 0.1;
      }
      if (pos.y < 0.0) {
        vel.y *= -1;
        pos.y = 0.0;
      }
      if (pos.y >= height) {
        vel.y *= -1;
        pos.y = height - 0.1;
      }
    }
  }
  
  function CircleBoundary(center, radius) {
    this.center = center;
    this.radius = radius;
    this.isCircleBoundary = true;
  }
  
  CircleBoundary.prototype.calcDistance = function(p) {
    return processing.max(p.dist(this.center) - this.radius, 0.0);
  };
  
  CircleBoundary.prototype.calcNormal = function(p) {
    return p5.Vector.sub(p, this.center).normalize(); 
  };  
}


console.log('page loaded');
var canvas = document.getElementById("canvas");
var instance = new Processing(canvas, boidProcess);

