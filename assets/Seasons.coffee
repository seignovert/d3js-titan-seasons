# Orbital seasons coffeescript

# Cosine and sine of angle in degrees
dcos = (angle) -> Math.cos(angle/180*Math.PI)
dsin = (angle) -> Math.sin(angle/180*Math.PI)

# Shortcuts
text    = (x,y,s) -> {'x': x, 'y': y, 'font-size': s}
circle  = (x,y,r) -> {'cx': x, 'cy': y, 'r': r}
line    = (x1,y1,x2,y2) -> {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2 }
ellipse = (rx,ry,cx,cy) -> {'rx': rx, 'ry': ry, 'cx': cx, 'cy': cy }

# SVG Canvas
class SVG
  constructor: (@w = 900, @h = 600) ->
    @svg = d3.select('body')
              .append('svg')
                .attr( {
                  'width'    : @w
                  'height'   : @h
                  'transform': "translate(#{@w/2},#{@h/2})"
                  })

  addOrbit: ( a = 200, b = 200, rot = 0 ) ->
    @orbit = new Orbit(a,b,rot)
    @orbit.draw(@svg)

  addSun: ( e = 0, R = '25', color = 'yellow' ) ->
    @sun = new Sun( @orbit ? @addOrbit(), e, R, color)
    @sun.draw(@svg)

  addTitan: (Ls = 0) ->
    @titan = new Titan( @sun ? @addSun() )
    @titan.draw(@svg)
    @titan.update(Ls)

  addInnerTicks: ->
    for Ls in [0..360] by 10
      @sun.tick(Ls,'',5)
    for Ls in [0..360] by 30
      @sun.tick(Ls,'',10)

  addYears: (years) ->
    for year in years
      @sun.tick(year.Ls,year.date,-10)

  addFlybys: (flybys) ->
    for flyby in flybys
      @sun.coverage( flyby.Ls, flyby.Ls+1, flyby.color, flyby.name )

  addCassini: (cassini) ->
    [first, ..., last] = cassini
    @sun.coverage( first.Ls, last.Ls, first.color, 'Cassini' )

  addLegend: (legend) ->
    for leg in legend
      @sun.legend( leg )

# Orbit object
class Orbit
  constructor: (@a = 200, @b = 200, @rot = 0) ->
    @cos_r  = dcos(@rot)
    @sin_r  = dsin(@rot)
    @cos_r2 = Math.pow(@cos_r,2)
    @sin_r2 = Math.pow(@sin_r,2)
    @inv_a2 = 1 / Math.pow(@a,2)
    @inv_b2 = 1 / Math.pow(@b,2)

    @attr = {
      'id'       :'orbit'
      'transform': "rotate(#{@rot})"
    }
    @ellipse = {
      'attr' : ellipse(@a,@b,0,0)
      'style': {
        'fill'            : 'none'
        'stroke'          : 'black'
        'stroke-width'    : 1
        'stroke-dasharray': '1,3'
      }
    }
    @majorAxis = {
      'attr' : line(@a,0,-@a,0)
      'style': {
        'stroke'          : 'black'
        'stroke-width'    : 1
        'stroke-dasharray': '2,5'
      }
    }

  # Draw the orbit with dashs
  draw: (svg)->
    @g = svg.append('g')
              .attr( @attr )
    @g.append('ellipse')
        .attr( @ellipse.attr )
        .style( @ellipse.style )
    @g.append('line')
        .attr( @majorAxis.attr )
        .style( @majorAxis.style )

  # Vertical position on the tilted ellipse
  ell_Y: (X)->
    A = @sin_r2 * @inv_a2 + @cos_r2 * @inv_b2
    B = 2 * X * @cos_r * @sin_r * ( @inv_a2 - @inv_b2 )
    C = Math.pow(X,2) * ( @cos_r2 * @inv_a2 + @sin_r2 * @inv_b2 ) - 1
    D = Math.pow(B,2) - 4 * A * C
    [ .5*(-B + Math.sqrt(D))/A, .5*(-B - Math.sqrt(D))/A ]

  # Horizontal position on the tilted ellipse
  ell_X: (Y) ->
    A = @cos_r2 * @inv_a2 + @sin_r2 * @inv_b2
    B = 2 * Y * @cos_r * @sin_r * ( @inv_a2 - @inv_b2 );
    C = Math.pow(Y,2) * ( @sin_r2 * @inv_a2 + @cos_r2 * @inv_b2 ) - 1;
    D = Math.pow(B,2) - 4 * A * C;
    [ .5*(-B + Math.sqrt(D))/A, .5*(-B - Math.sqrt(D))/A ]

# Sun object
class Sun
  constructor: (@orbit, e, @R = 25, @color = 'yellow') ->
    @x = e * @orbit.a * @orbit.cos_r
    @y = e * @orbit.a * @orbit.sin_r

    @attr  = circle(@x,@y,@R)
    @style = {
      'fill': @color
    }
    @lineStyle = {
      'stroke'          : 'black'
      'stroke-width'    : 1
      'stroke-dasharray': '1,10'
    }
    @textStyle = {
      'text-anchor'      : 'middle'
      'dominant-baseline': 'central'
    }

    @yEq    = @orbit.ell_Y(@x)
    @lineEq = line(@x,@yEq[0],@x,@yEq[1])

    @xSol    = @orbit.ell_X(@y)
    @lineSol = line(@xSol[0],@y,@xSol[1],@y)

  # Draw the Sun location
  draw: (svg)->
    @g = svg.insert('g','#orbit')
    @t = @g.append('g')
      .attr('id','ticks')
    @g.append('line')
      .attr( @lineEq )
      .style( @lineStyle )
    @g.append('line')
      .attr( @lineSol )
      .style( @lineStyle )
    svg.append('circle')
      .attr( 'id', 'Sun')
      .attr( @attr )
      .style( @style )

  # Position on the tilted ellipse at the solar longitude Ls
  Ls: (angle) ->
    switch angle
      when 0 then   return [ @x, @yEq[1] ]
      when 180 then return [ @x, @yEq[0] ]
      else
        c = dcos(angle)/dsin(angle)
        d = @y - @x * c
        A = Math.pow(c * @orbit.sin_r + @orbit.cos_r,2) * @orbit.inv_a2 + Math.pow(c * @orbit.cos_r - @orbit.sin_r,2) * @orbit.inv_b2
        B = 2 * d * ( @orbit.cos_r * @orbit.sin_r * (@orbit.inv_a2 - @orbit.inv_b2) + c * (@orbit.sin_r2 * @orbit.inv_a2 + @orbit.cos_r2 * @orbit.inv_b2) )
        C = Math.pow(d,2) * (@orbit.sin_r2 * @orbit.inv_a2 + @orbit.cos_r2 * @orbit.inv_b2) - 1
        D = Math.pow(B,2) - 4 * A * C
        X = .5*( -B + ( if angle <= 180 then -1 else 1 ) * Math.sqrt(D) )/A
        Y = X * c + d
    [ X,Y ]

  # Draw tick on the orbit
  tick: ( Ls, txt, length = 10 )->
    [x,y] = @Ls( Ls )
    lx = length * dsin(Ls)
    ly = length * dcos(Ls)
    @t.append('path')
      .attr('d', "M #{x},#{y} l #{lx},#{ly}" )
      .style({ 'stroke': 'black', 'stroke-width': 1, 'fill': 'none' })
    if txt?
      @t.append('text')
        .attr( text(x+2.5*lx,y+2.5*ly,10) )
        .style( @textStyle )
        .text( txt )

  # Draw thick portion of ellipse between Ls1 and Ls2
  coverage: ( Ls1, Ls2, color = 'gray', name, thickness = 30 )->
    [x1,y1] = @Ls( Ls1 )
    [x2,y2] = @Ls( Ls2 )
    x3 = x2 + thickness * dsin(Ls2)
    y3 = y2 + thickness * dcos(Ls2)
    x4 = x1 + thickness * dsin(Ls1)
    y4 = y1 + thickness * dcos(Ls1)
    a2 = @orbit.a-thickness
    b2 = @orbit.b-thickness
    d  = "M #{x1},#{y1}"
    d += "A #{@orbit.a},#{@orbit.b} #{@orbit.rot} 0 0 #{x2},#{y2}"
    d += "L #{x3},#{y3}"
    d += "A #{a2},#{b2} #{@orbit.rot} 0 1 #{x4},#{y4} Z"

    @t.append('path')
      .attr( 'd', d )
      .style({ 'stroke': 'none', 'fill': color, 'opacity': 0.3 })
    if name?
      xt = x3 + .85*thickness * dsin(Ls2)
      yt = y3 + .85*thickness * dcos(Ls2)
      rt = if Ls2 < 180 then 90-Ls2 else -90-Ls2
      @t.append('text')
        .attr( text(xt,yt,10) )
        .attr( 'transform', "rotate(#{rt},#{xt},#{yt})" )
        .style( @textStyle )
        .text( name )

  # Draw legend text
  legend: ( leg )->
    console.log leg.Ls
    [x,y] = @Ls( leg.Ls )
    r = Math.sqrt(x*x + y*y)
    xt = @x - leg.r * r * dsin(leg.Ls)
    yt = @y - leg.r * r * dcos(leg.Ls)
    rt = leg.rot ? (if leg.Ls < 180 then 90-leg.Ls else -90-leg.Ls)
    st = leg.size ? 10
    @t.append('text')
      .attr( text(xt,yt,st) )
      .attr( 'transform', "rotate(#{rt},#{xt},#{yt})" )
      .style( @textStyle )
      .text( leg.text )


# Planet object
class Planet
  constructor: (@sun, @R = 15, @obl = 0, @color = 'blue', @class='Planet') ->
    @pole        = line(0,2*@R,0,-2*@R)
    @planet      = circle(0,0,@R)
    @poleN       = text( @R,  -2*@R, 12)
    @poleS       = text(-@R, 2.5*@R, 12)
    @textPole    = { 'text-anchor':'middle' }
    @planetStyle = { 'fill': @color }
    @shadowStyle = { 'fill': 'dimgray' }
    @poleStyle   = { 'stroke': 'black', 'stroke-width': 1, 'fill': 'none' }
    @eq          = { 'd': "M #{@R},0 A #{@R},#{.3*@R} 0 0 1 -#{@R},0" }

  # Init the planet drawing at (0,0)
  draw: (svg) ->
    @l = svg.insert('path','#orbit')
        .attr({'d': @dSun(0,0), 'class': @class})
        .style('stroke', 'gray')

    @g = svg.append('g')
             .attr( 'class', @class )
    @g.append('text')
      .attr( @poleN )
      .style( @textPole )
      .text('N')
    @g.append('text')
      .attr( @poleS )
      .style( @textPole )
      .text('S')
    @g.append('line')
      .attr( @pole )
      .attr( 'transform', "rotate(#{@obl})" )
      .style( @poleStyle )
    @g.append('circle')
      .attr( @planet )
      .style( @planetStyle )
    @s = @g.append('path')
      .attr({'d': @dShadow(0), 'class':'shadow'})
      .style( @shadowStyle )
    @g.append('path')
      .attr( @eq )
      .attr( 'transform', "rotate(#{@obl})" )
      .style( @poleStyle )

  # Move the position of the planet at the solar longitude Ls
  update: (Ls) ->
    [x,y] = @sun.Ls( Ls )
    @g.attr('transform', "translate(#{x},#{y})" )
    @l.attr({'d': @dSun(x,y), 'class': @class})
    @s.attr({'d': @dShadow(Ls) })

  # Line from the Sun to the planet
  dSun: (x,y)->
    "M #{@sun.x},#{@sun.y}  L #{x},#{y}"

  # Casted shadow on the planet
  dShadow: (Ls)->
    h = @R * Math.abs( dcos(Ls) )
    side = if Ls <= 180 then '1 1' else '0 0'
    shadow = if dcos(Ls)*dsin(Ls) < 0 then '0 1' else if Ls < 90 then '0 0' else '1 0'
    "M 0,#{@R} A #{@R},#{@R} 0 #{side} 0,-#{@R} A  #{h},#{@R} 0 #{shadow} 0,#{@R}"

# Titan object
class Titan extends Planet

  constructor: (sun) ->
    super(sun, 15, 26.73, 'gold', 'Titan')
