function Torus(tag, params) {
    // Configurable parameters
    if (params === undefined)
	params = {};
    this.n           = params.n           || 5;
    this.min_n       = params.min_n       || 4;
    this.max_n       = params.max_n       || 30;
    this.width       = params.width       || Math.min(window.innerHeight,
						      window.innerWidth) - 100;
    this.height      = params.height      || this.width;
    this.speed       = params.speed       || 4000;
    this.bolt_speed  = params.bolt_speed  || 500 / this.n;
    this.faded_color = params.faded_color || "#ddd";
    this.dot_size    = params.dot_size    || this.width / 200;
    this.font_size   = params.dot_size    || this.width / 50;
    // Flags
    this.running = false;
    this.firing = false;
    // Other entities
    this.abscissae = [];
    this.ordinates = [];
    // Explosion
    this.exp_path   = 'explosion.gif';
    this.exp_w      = this.width / 10;
    this.exp_h      = this.width / 10;
    this.exp_t      = 800;
    // Control keys
    this.key_down   = params.key_down  || 40;
    this.key_up     = params.key_up    || 38;
    this.key_fire   = params.key_fire  || 32;
    this.incr_size  = params.incr_size || 61;
    this.decr_size  = params.decr_size || 109;
    this.num_start  = params.num_start || '0'.charCodeAt();
    this.bckspc_mod = params.pos_mod   || 8;
    this.neg_mod    = params.neg_mod   || 16;

    // Utility function to compute the coordinates in the grid
    this.grid = function(i) {
	return this.width * i / this.n + this.width / this.n / 2;
    }

    // Utility function to handle hits
    this.hit = function(i, j) {
	function close_nuff(a, b) {
	    return Math.abs(a - b) < 1e-12;
	}
	if (close_nuff(i, 0) && close_nuff(j, this.player.pos)) {
	    var me = this;
	    this.explode(i, j, function() {
		me.game_over();
		me.firing = false;
	    });
	    return true;
	} else {
	    var hits = false;
	    for (e in this.enemies) {
		if (close_nuff(i, this.enemies[e].pos_x) && close_nuff(j, this.enemies[e].pos_y)) {
		    this.explode(i, j, function() {});
		    this.enemies[e].destroy();
		    this.enemies.splice(e, 1);
		    hits = true;
		}
	    }
	    if (hits)
		this.firing = false;
	    return hits;
	}
    }

    this.explode = function(i, j, callback) {
	var exp = torus.paper.image(this.exp_path,
				    torus.grid(i) - this.exp_w/2,
				    torus.grid(j) - this.exp_h/2,
				    this.exp_w, this.exp_h);
	window.setTimeout(function() { exp.remove(); callback(); }, this.exp_t);
    }

    // Keyborad events handler
    this.key_controls = function(e) {
	// Game controls
	if (this.running) {
	    if (e.keyCode == this.key_up) {
		this.player.up();
	    } else if (e.keyCode == this.key_down) {
		this.player.down();
	    } else if (e.keyCode >= this.num_start && e.keyCode < this.num_start + 10) {
		var dir = this.player.dir * 10 + (e.keyCode - this.num_start) * (this.player.dir < 0 ? -1 : 1);
		this.player.raise(dir);
	    } else if (e.keyCode == this.neg_mod) {
		this.player.raise(-this.player.dir);
	    } else if (e.keyCode == this.bckspc_mod) {
		var dir = (this.player.dir < 0 ? Math.ceil : Math.floor)(this.player.dir / 10);
		this.player.raise(dir);
	    } else if (e.keyCode == this.key_fire && !this.firing) {
		this.firing = true;
		this.player.fire();
		this.player.raise(0);
	    }
	}
	// Other controls
	else {
	    if (e.keyCode == this.key_fire) {
		this.run();
	    } else if (e.keyCode == this.incr_size) {
		this.grow_dimen(1);
	    } else if (e.keyCode == this.decr_size) {
		this.grow_dimen(-1);
	    }
	}
    }

    // Setup function to initialize the field
    this.init = function() {
	// The block containing the game (so we can add controls)
	var torus = document.getElementById(tag);
	// The drawing canvas
	var canvas = document.createElement('div');
	canvas.style.display = 'inline-block';
	canvas.style.border = 'solid thin black';
	canvas.style.borderRadius = '10px';
	this.paper = Raphael(canvas, this.width, this.height);
	this.paper.setViewBox(-2*this.font_size, -2*this.font_size,
			      this.width + 4*this.font_size,
			      this.height + 4*this.font_size);
	torus.appendChild(canvas);

	// The controls
	var controls = document.createElement('div');
 	controls.style.display = 'inline-block';
	controls.style.margin = '0 1em';
	controls.style.textAlign = 'center';
	controls.style.verticalAlign = 'top';
	controls.innerHTML = '<p><b>Dimension</b><br/>' +
	    '<input type="number" id="dimension" value="' + this.n + '" style="width:3em; text-align:center" /></p>'+
	    '<p><b>Direction<br/>' + '<span id="dir"></span></b></p>' +
	    '<p style="text-align: left; margin-top: 4em"><b>Controls</b><br/>' +
	    '<b>aim:</b> arrow up/down<br/>' +
	    '<b>aim:</b> 0-9<br/>' +
	    '<b>reflect aim:</b> shift<br/>' +
	    '<b>undo aim:</b> backspace<br/>' +
	    '<b>fire:</b> space bar<br/>' +
	    '</p>';
	torus.appendChild(controls);
	this.dim_control = document.getElementById('dimension');
	this.dir_control = document.getElementById('dir');

	// Event handlers
	var me = this;
	document.addEventListener("keydown", function(e) { me.key_controls(e) }, true);
	this.dim_control.addEventListener('change', 
					  function () {
					      me.grow_dimen(this.value - me.n) }, true);

	this.arena();
    }

    // Grow the dimension of the arena
    this.grow_dimen = function(diff) {
	if (!this.running && this.n + diff >= this.min_n && this.n + diff <= this.max_n) {
	    this.n += diff;
	    this.dim_control.value = this.n;
	    this.arena();
	}
    }

    this.arena = function() {
	this.paper.clear();
	// The grid
	this.paper.setStart();
	for (var i = 0 ; i < this.n ; i++) {
	    this.abscissae[i] = this.paper.set();
	    this.abscissae[i].push(
		this.paper.text(this.grid(i), -this.font_size, i),
		this.paper.text(this.grid(i), this.height + this.font_size, i));
	    this.ordinates[i] = this.paper.set();
	    this.ordinates[i].push(
		this.paper.text(-this.font_size, this.grid(i), i),
		this.paper.text(this.width + this.font_size, this.grid(i), i));
	    for (var j = 0 ; j < this.n ; j++) {
		this.paper.circle(this.grid(i), this.grid(j), this.dot_size);
	    }
	}
	st = this.paper.setFinish();
	st.attr("fill", this.faded_color);
	st.attr("stroke", this.faded_color);
	st.attr("font-family", "sans-serif");
	st.attr("font-size", this.font_size);

	// Create characters
	this.player = new Player(this);
	this.enemies = [];

	// Welcome message
	this.message = this.paper.text(this.width/2, this.height/2, "Press space to play");
	this.message.attr("text-align", "center");
	this.message.attr("font-size", this.width/12);
    }

    // Enables/disables controls
    this.toggle_controls = function() {
	if (this.dim_control.disabled) {
	    this.dim_control.disabled = false;
	} else {
	    this.dim_control.blur();
	    this.dim_control.disabled = true;
	}
    }

    // Reflects the current direction
    // in the direction box
    this.update_dir = function(dir) {
	this.dir_control.innerHTML = dir;
    }

    // Starts the game
    this.run = function() {
	if (!this.running) {
	    this.running = true;
	    this.toggle_controls();
	    this.message.remove();
	    this.enemy_factory();
	}
    }

    // Game over
    this.game_over = function() {
	if (this.running) {
	    this.running = false;
	    this.message = this.paper.text(this.width/2, this.height/2, "Game over\nPress space to play");
	    this.message.attr("text-align", "center");
	    this.message.attr("font-size", this.width/12);
	    window.clearInterval(this.enemy_to);
	    for (e in this.enemies) {
		this.enemies[e].destroy();
	    }
	    this.enemies = [];
	    this.player.destroy();
	    this.player = new Player(this);
	    
	    this.typed_dir = '';

	    this.toggle_controls();
	}
    }

    // Creates enemies at random
    this.enemy_factory = function() {
	if (this.running) {
	    var e = new Enemy(this);
	    this.enemies.push(e);
	    var me = this;
	    this.enemy_to = window.setTimeout(function() {
		me.enemy_factory();
	    }, this.speed / 2 + Math.random() * this.speed);
	}
    }
}


// The player's character
function Player(torus) {
    this.pos        = Math.floor(Math.random() * torus.n);
    this.up_space   = 0;
    this.down_space = 0;
    this.dir        = 0;
    this.range      = 1;
    this.fix_path   = 'player.png';
    this.fix_w      = torus.width / 20;
    this.fix_h      = torus.width / 20;
    this.color      = torus.player_color    || "#0f0";
    this.sight_w    = torus.sight_thickness || "0.2";

    this.aim = function(i, j) {
	if (i == this.range) {
	    var angle = 180 * Math.atan(j - this.pos) / Math.PI;
	    this.fix.transform("R" + angle);
	    
	    var orig = torus.grid(0) + "," + torus.grid(this.pos);
	    var dest = torus.grid(i) + "," + torus.grid(j);
	    this.sight.attr("path", "M" + orig + "L" + dest);
	}
    }
    
    this.raise = function(dir) {
	this.dir = dir;
	this.aim(this.range, (dir % torus.n + this.pos + torus.n) % torus.n);
	torus.update_dir(dir);
    }

    this.down = function() {
	this.raise(this.dir + 1);
    }

    this.up = function() {
	this.raise(this.dir - 1);
    }
    
    this.fire = function() {
	var dir = (this.dir % torus.n + this.pos + torus.n) % torus.n - this.pos;
	var bolt_x = 0, bolt_y = this.pos;
	var step = 2 * (dir ? Math.abs(dir) : 1);
	var incr_x = 1 / step, incr_y = dir / step;
	var incr_time = torus.bolt_speed / (step*step*step);

	var bolt = torus.paper.circle(torus.grid(bolt_x), torus.grid(bolt_y), this.fix_w / 6);
	bolt.attr("fill", this.color);
	bolt.attr("stroke", this.color);

	function launch(first) {
	    // Hit test
	    if (!first && torus.hit(bolt_x, bolt_y)) {
		bolt.remove();
		return;
	    }
	    // Wrap around
	    if (bolt_x >= torus.n - 0.5) {
		bolt_x -= torus.n;
		bolt.attr("cx", torus.grid(bolt_x));
	    }
	    if (bolt_y >= torus.n - 0.5) {
		bolt_y -= torus.n;
		bolt.attr("cy", torus.grid(bolt_y));
	    }
	    else if (bolt_y <= -0.5)  {
		bolt_y += torus.n;
		bolt.attr("cy", torus.grid(bolt_y));
	    }
	    // Next step
	    bolt_x += incr_x;
	    bolt_y += incr_y;
	    var anim = Raphael.animation({cx: torus.grid(bolt_x), cy: torus.grid(bolt_y)}, incr_time, "linear",
					 function() { launch(false) } );
	    bolt.animate(anim);
	}

	launch(true);
    }

    this.destroy = function() {
	this.fix.remove();
	this.sight.remove();
    }

    /* Initializations */
    // Initialization of the sight
    this.sight = torus.paper.path("M0,0L0,0");
    this.sight.attr("fill", this.color);
    this.sight.attr("stroke", this.color);
    this.sight.attr("stroke-width", this.sight_w);
    
    // Initialization of the fixture
    this.fix = torus.paper.image(this.fix_path,
				 torus.grid(0) - this.fix_w/2,
				 torus.grid(this.pos) - this.fix_h/2,
				 this.fix_w, this.fix_h);

    // Orient the fixture
    this.raise(this.dir);
}


// The enemies
function Enemy(torus, params) {
    this.active     = true
    this.pos_x      = torus.n - 1;
    this.pos_y      = Math.floor(Math.random() * torus.n);
    this.up_space   = 0;
    this.down_space = 0;
    this.dir        = 0;
    this.range      = 2;
    this.fix_path   = 'villain.png';
    this.fix_w      = torus.width / 20;
    this.fix_h      = torus.width / 20;
    this.color      = torus.player_color    || "#f00";

    this.step = function() {
	if (torus.running || this.active) {
	    this.pos_x -= 1;
	    this.pos_y += this.dir;
	    var me = this;
	    this.fix.animate({x: torus.grid(this.pos_x) - this.fix_w/2,
			      y: torus.grid(this.pos_y) - this.fix_h/2},
			     200, "linear", function() {
				 if (me.pos_x == me.range)
				     me.fire();
				 else
				     window.setTimeout(function() { me.step(); }, torus.speed);		
			     });
	}
    }

    this.fire = function() {
	var bolt = torus.paper.circle(torus.grid(this.pos_x), torus.grid(this.pos_y), this.fix_w / 6);
	bolt.attr("fill", this.color);
	bolt.attr("stroke", this.color);
	bolt.animate({cx: torus.grid(0), cy: torus.grid(torus.player.pos)}, 200, "linear",
		     function() {
			 torus.hit(0, torus.player.pos);
			 bolt.remove();
		     });
    }

    this.destroy = function() {
	this.active = false;
	this.fix.remove();
    }

    /* Initializations */
    this.fix = torus.paper.image(this.fix_path,
				 torus.grid(this.pos_x) - this.fix_w/2,
				 torus.grid(this.pos_y) - this.fix_h/2,
				 this.fix_w, this.fix_h);
    var me = this;
    window.setTimeout(function() { me.step(); }, torus.speed);
}
