var Orbit, Planet, SVG, Sun, Titan, circle, dcos, dsin, ellipse, line, text,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

dcos = function(angle) {
  return Math.cos(angle / 180 * Math.PI);
};

dsin = function(angle) {
  return Math.sin(angle / 180 * Math.PI);
};

text = function(x, y, s) {
  return {
    'x': x,
    'y': y,
    'font-size': s
  };
};

circle = function(x, y, r) {
  return {
    'cx': x,
    'cy': y,
    'r': r
  };
};

line = function(x1, y1, x2, y2) {
  return {
    'x1': x1,
    'y1': y1,
    'x2': x2,
    'y2': y2
  };
};

ellipse = function(rx, ry, cx, cy) {
  return {
    'rx': rx,
    'ry': ry,
    'cx': cx,
    'cy': cy
  };
};

SVG = (function() {
  function SVG(w, h1) {
    this.w = w != null ? w : 900;
    this.h = h1 != null ? h1 : 600;
    this.svg = d3.select('body').append('svg').attr({
      'width': this.w,
      'height': this.h,
      'transform': "translate(" + (this.w / 2) + "," + (this.h / 2) + ")"
    });
  }

  SVG.prototype.addOrbit = function(a, b, rot) {
    if (a == null) {
      a = 200;
    }
    if (b == null) {
      b = 200;
    }
    if (rot == null) {
      rot = 0;
    }
    this.orbit = new Orbit(a, b, rot);
    return this.orbit.draw(this.svg);
  };

  SVG.prototype.addSun = function(e, R, color) {
    var ref;
    if (e == null) {
      e = 0;
    }
    if (R == null) {
      R = '25';
    }
    if (color == null) {
      color = 'yellow';
    }
    this.sun = new Sun((ref = this.orbit) != null ? ref : this.addOrbit(), e, R, color);
    return this.sun.draw(this.svg);
  };

  SVG.prototype.addTitan = function(Ls) {
    var ref;
    if (Ls == null) {
      Ls = 0;
    }
    this.titan = new Titan((ref = this.sun) != null ? ref : this.addSun());
    this.titan.draw(this.svg);
    return this.titan.update(Ls);
  };

  SVG.prototype.addInnerTicks = function() {
    var Ls, i, j, results;
    for (Ls = i = 0; i <= 360; Ls = i += 10) {
      this.sun.tick(Ls, '', 5);
    }
    results = [];
    for (Ls = j = 0; j <= 360; Ls = j += 30) {
      results.push(this.sun.tick(Ls, '', 10));
    }
    return results;
  };

  SVG.prototype.addYears = function(years) {
    var i, len, results, year;
    results = [];
    for (i = 0, len = years.length; i < len; i++) {
      year = years[i];
      results.push(this.sun.tick(year.Ls, year.date, -10));
    }
    return results;
  };

  SVG.prototype.addFlybys = function(flybys) {
    var flyby, i, len, results;
    results = [];
    for (i = 0, len = flybys.length; i < len; i++) {
      flyby = flybys[i];
      results.push(this.sun.coverage(flyby.Ls, flyby.Ls + 1, flyby.color, flyby.name));
    }
    return results;
  };

  SVG.prototype.addCassini = function(cassini) {
    var first, last;
    first = cassini[0], last = cassini[cassini.length - 1];
    return this.sun.coverage(first.Ls, last.Ls, first.color, 'Cassini');
  };

  SVG.prototype.addLegend = function(legend) {
    var i, leg, len, results;
    results = [];
    for (i = 0, len = legend.length; i < len; i++) {
      leg = legend[i];
      results.push(this.sun.legend(leg));
    }
    return results;
  };

  return SVG;

})();

Orbit = (function() {
  function Orbit(a1, b1, rot1) {
    this.a = a1 != null ? a1 : 200;
    this.b = b1 != null ? b1 : 200;
    this.rot = rot1 != null ? rot1 : 0;
    this.cos_r = dcos(this.rot);
    this.sin_r = dsin(this.rot);
    this.cos_r2 = Math.pow(this.cos_r, 2);
    this.sin_r2 = Math.pow(this.sin_r, 2);
    this.inv_a2 = 1 / Math.pow(this.a, 2);
    this.inv_b2 = 1 / Math.pow(this.b, 2);
    this.attr = {
      'id': 'orbit',
      'transform': "rotate(" + this.rot + ")"
    };
    this.ellipse = {
      'attr': ellipse(this.a, this.b, 0, 0),
      'style': {
        'fill': 'none',
        'stroke': 'black',
        'stroke-width': 1,
        'stroke-dasharray': '1,3'
      }
    };
    this.majorAxis = {
      'attr': line(this.a, 0, -this.a, 0),
      'style': {
        'stroke': 'black',
        'stroke-width': 1,
        'stroke-dasharray': '2,5'
      }
    };
  }

  Orbit.prototype.draw = function(svg) {
    this.g = svg.append('g').attr(this.attr);
    this.g.append('ellipse').attr(this.ellipse.attr).style(this.ellipse.style);
    return this.g.append('line').attr(this.majorAxis.attr).style(this.majorAxis.style);
  };

  Orbit.prototype.ell_Y = function(X) {
    var A, B, C, D;
    A = this.sin_r2 * this.inv_a2 + this.cos_r2 * this.inv_b2;
    B = 2 * X * this.cos_r * this.sin_r * (this.inv_a2 - this.inv_b2);
    C = Math.pow(X, 2) * (this.cos_r2 * this.inv_a2 + this.sin_r2 * this.inv_b2) - 1;
    D = Math.pow(B, 2) - 4 * A * C;
    return [.5 * (-B + Math.sqrt(D)) / A, .5 * (-B - Math.sqrt(D)) / A];
  };

  Orbit.prototype.ell_X = function(Y) {
    var A, B, C, D;
    A = this.cos_r2 * this.inv_a2 + this.sin_r2 * this.inv_b2;
    B = 2 * Y * this.cos_r * this.sin_r * (this.inv_a2 - this.inv_b2);
    C = Math.pow(Y, 2) * (this.sin_r2 * this.inv_a2 + this.cos_r2 * this.inv_b2) - 1;
    D = Math.pow(B, 2) - 4 * A * C;
    return [.5 * (-B + Math.sqrt(D)) / A, .5 * (-B - Math.sqrt(D)) / A];
  };

  return Orbit;

})();

Sun = (function() {
  function Sun(orbit, e, R1, color1) {
    this.orbit = orbit;
    this.R = R1 != null ? R1 : 25;
    this.color = color1 != null ? color1 : 'yellow';
    this.x = e * this.orbit.a * this.orbit.cos_r;
    this.y = e * this.orbit.a * this.orbit.sin_r;
    this.attr = circle(this.x, this.y, this.R);
    this.style = {
      'fill': this.color
    };
    this.lineStyle = {
      'stroke': 'black',
      'stroke-width': 1,
      'stroke-dasharray': '1,10'
    };
    this.textStyle = {
      'text-anchor': 'middle',
      'dominant-baseline': 'central'
    };
    this.yEq = this.orbit.ell_Y(this.x);
    this.lineEq = line(this.x, this.yEq[0], this.x, this.yEq[1]);
    this.xSol = this.orbit.ell_X(this.y);
    this.lineSol = line(this.xSol[0], this.y, this.xSol[1], this.y);
  }

  Sun.prototype.draw = function(svg) {
    this.g = svg.insert('g', '#orbit');
    this.t = this.g.append('g').attr('id', 'ticks');
    this.g.append('line').attr(this.lineEq).style(this.lineStyle);
    this.g.append('line').attr(this.lineSol).style(this.lineStyle);
    return svg.append('circle').attr('id', 'Sun').attr(this.attr).style(this.style);
  };

  Sun.prototype.Ls = function(angle) {
    var A, B, C, D, X, Y, c, d;
    switch (angle) {
      case 0:
        return [this.x, this.yEq[1]];
      case 180:
        return [this.x, this.yEq[0]];
      default:
        c = dcos(angle) / dsin(angle);
        d = this.y - this.x * c;
        A = Math.pow(c * this.orbit.sin_r + this.orbit.cos_r, 2) * this.orbit.inv_a2 + Math.pow(c * this.orbit.cos_r - this.orbit.sin_r, 2) * this.orbit.inv_b2;
        B = 2 * d * (this.orbit.cos_r * this.orbit.sin_r * (this.orbit.inv_a2 - this.orbit.inv_b2) + c * (this.orbit.sin_r2 * this.orbit.inv_a2 + this.orbit.cos_r2 * this.orbit.inv_b2));
        C = Math.pow(d, 2) * (this.orbit.sin_r2 * this.orbit.inv_a2 + this.orbit.cos_r2 * this.orbit.inv_b2) - 1;
        D = Math.pow(B, 2) - 4 * A * C;
        X = .5 * (-B + (angle <= 180 ? -1 : 1) * Math.sqrt(D)) / A;
        Y = X * c + d;
    }
    return [X, Y];
  };

  Sun.prototype.tick = function(Ls, txt, length) {
    var lx, ly, ref, x, y;
    if (length == null) {
      length = 10;
    }
    ref = this.Ls(Ls), x = ref[0], y = ref[1];
    lx = length * dsin(Ls);
    ly = length * dcos(Ls);
    this.t.append('path').attr('d', "M " + x + "," + y + " l " + lx + "," + ly).style({
      'stroke': 'black',
      'stroke-width': 1,
      'fill': 'none'
    });
    if (txt != null) {
      return this.t.append('text').attr(text(x + 2.5 * lx, y + 2.5 * ly, 10)).style(this.textStyle).text(txt);
    }
  };

  Sun.prototype.coverage = function(Ls1, Ls2, color, name, thickness) {
    var a2, b2, d, ref, ref1, rt, x1, x2, x3, x4, xt, y1, y2, y3, y4, yt;
    if (color == null) {
      color = 'gray';
    }
    if (thickness == null) {
      thickness = 30;
    }
    ref = this.Ls(Ls1), x1 = ref[0], y1 = ref[1];
    ref1 = this.Ls(Ls2), x2 = ref1[0], y2 = ref1[1];
    x3 = x2 + thickness * dsin(Ls2);
    y3 = y2 + thickness * dcos(Ls2);
    x4 = x1 + thickness * dsin(Ls1);
    y4 = y1 + thickness * dcos(Ls1);
    a2 = this.orbit.a - thickness;
    b2 = this.orbit.b - thickness;
    d = "M " + x1 + "," + y1;
    d += "A " + this.orbit.a + "," + this.orbit.b + " " + this.orbit.rot + " 0 0 " + x2 + "," + y2;
    d += "L " + x3 + "," + y3;
    d += "A " + a2 + "," + b2 + " " + this.orbit.rot + " 0 1 " + x4 + "," + y4 + " Z";
    this.t.append('path').attr('d', d).style({
      'stroke': 'none',
      'fill': color,
      'opacity': 0.3
    });
    if (name != null) {
      xt = x3 + .85 * thickness * dsin(Ls2);
      yt = y3 + .85 * thickness * dcos(Ls2);
      rt = Ls2 < 180 ? 90 - Ls2 : -90 - Ls2;
      return this.t.append('text').attr(text(xt, yt, 10)).attr('transform', "rotate(" + rt + "," + xt + "," + yt + ")").style(this.textStyle).text(name);
    }
  };

  Sun.prototype.legend = function(leg) {
    var r, ref, ref1, ref2, rt, st, x, xt, y, yt;
    ref = this.Ls(leg.Ls), x = ref[0], y = ref[1];
    r = Math.sqrt(x * x + y * y);
    xt = this.x - leg.r * r * dsin(leg.Ls);
    yt = this.y - leg.r * r * dcos(leg.Ls);
    rt = (ref1 = leg.rot) != null ? ref1 : (leg.Ls < 180 ? 90 - leg.Ls : -90 - leg.Ls);
    st = (ref2 = leg.size) != null ? ref2 : 10;
    return this.t.append('text').attr(text(xt, yt, st)).attr('transform', "rotate(" + rt + "," + xt + "," + yt + ")").style(this.textStyle).text(leg.text);
  };

  return Sun;

})();

Planet = (function() {
  function Planet(sun1, R1, obl, color1, _class) {
    this.sun = sun1;
    this.R = R1 != null ? R1 : 15;
    this.obl = obl != null ? obl : 0;
    this.color = color1 != null ? color1 : 'blue';
    this["class"] = _class != null ? _class : 'Planet';
    this.pole = line(0, 2 * this.R, 0, -2 * this.R);
    this.planet = circle(0, 0, this.R);
    this.poleN = text(this.R, -2 * this.R, 12);
    this.poleS = text(-this.R, 2.5 * this.R, 12);
    this.textPole = {
      'text-anchor': 'middle'
    };
    this.planetStyle = {
      'fill': this.color
    };
    this.shadowStyle = {
      'fill': 'dimgray'
    };
    this.poleStyle = {
      'stroke': 'black',
      'stroke-width': 1,
      'fill': 'none'
    };
    this.eq = {
      'd': "M " + this.R + ",0 A " + this.R + "," + (.3 * this.R) + " 0 0 1 -" + this.R + ",0"
    };
  }

  Planet.prototype.draw = function(svg) {
    this.l = svg.insert('path', '#orbit').attr({
      'd': this.dSun(0, 0),
      'class': this["class"]
    }).style('stroke', 'gray');
    this.g = svg.append('g').attr('class', this["class"]);
    this.g.append('text').attr(this.poleN).style(this.textPole).text('N');
    this.g.append('text').attr(this.poleS).style(this.textPole).text('S');
    this.g.append('line').attr(this.pole).attr('transform', "rotate(" + this.obl + ")").style(this.poleStyle);
    this.g.append('circle').attr(this.planet).style(this.planetStyle);
    this.s = this.g.append('path').attr({
      'd': this.dShadow(0),
      'class': 'shadow'
    }).style(this.shadowStyle);
    return this.g.append('path').attr(this.eq).style(this.poleStyle);
  };

  Planet.prototype.update = function(Ls) {
    var ref, x, y;
    ref = this.sun.Ls(Ls), x = ref[0], y = ref[1];
    this.g.attr('transform', "translate(" + x + "," + y + ")");
    this.l.attr({
      'd': this.dSun(x, y),
      'class': this["class"]
    });
    return this.s.attr({
      'd': this.dShadow(Ls)
    });
  };

  Planet.prototype.dSun = function(x, y) {
    return "M " + this.sun.x + "," + this.sun.y + "  L " + x + "," + y;
  };

  Planet.prototype.dShadow = function(Ls) {
    var h, shadow, side;
    h = this.R * Math.abs(dcos(Ls));
    side = Ls <= 180 ? '1 1' : '0 0';
    shadow = dcos(Ls) * dsin(Ls) < 0 ? '0 1' : Ls < 90 ? '0 0' : '1 0';
    return "M 0," + this.R + " A " + this.R + "," + this.R + " 0 " + side + " 0,-" + this.R + " A  " + h + "," + this.R + " 0 " + shadow + " 0," + this.R;
  };

  return Planet;

})();

Titan = (function(superClass) {
  extend(Titan, superClass);

  function Titan(sun) {
    this.name = 'Titan';
    this.obl = 26.73;
    this.R_T = 15;
    this.color = 'gold';
    Titan.__super__.constructor.call(this, sun, this.R_T, this.obl, this.color, this.name);
  }

  return Titan;

})(Planet);
