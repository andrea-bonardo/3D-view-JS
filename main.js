import WindowManager from './WindowManager.js'



const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let cubes = [];
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};

let today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

// get time in seconds since beginning of the day (so that all windows use the same time)
function getTime ()
{
	return (new Date().getTime() - today) / 1000.0;
}


if (new URLSearchParams(window.location.search).get("clear"))
{
	localStorage.clear();
}
else
{	
	// this code is essential to circumvent that some browsers preload the content of some pages before you actually hit the url
	document.addEventListener("visibilitychange", () => 
	{
		if (document.visibilityState != 'hidden' && !initialized)
		{
			init();
		}
	});

	window.onload = () => {
		if (document.visibilityState != 'hidden')
		{
			init();
		}
	};

	function init ()
	{
		initialized = true;

		// add a short timeout because window.offsetX reports wrong values before a short period 
		setTimeout(() => {
			setupScene();
			setupWindowManager();
			resize();
			updateWindowShape(false);
			render();
			window.addEventListener('resize', resize);
		}, 500)	
	}

	function setupScene ()
	{
		camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);
		
		camera.position.z = 2.5;
		near = camera.position.z - .5;
		far = camera.position.z + 0.5;

		scene = new t.Scene();
		scene.background = new t.Color(0.0);
		scene.add( camera );

		renderer = new t.WebGLRenderer({antialias: true, depthBuffer: true});
		renderer.setPixelRatio(pixR);
	    
	  	world = new t.Object3D();
		scene.add(world);

		renderer.domElement.setAttribute("id", "scene");
		document.body.appendChild( renderer.domElement );
	}

	function setupWindowManager ()
	{
		windowManager = new WindowManager();
		windowManager.setWinShapeChangeCallback(updateWindowShape);
		windowManager.setWinChangeCallback(windowsUpdated);

		// here you can add your custom metadata to each windows instance
		let metaData = {foo: "bar"};

		// this will init the windowmanager and add this window to the centralised pool of windows
		windowManager.init(metaData);

		// call update windows initially (it will later be called by the win change callback)
		windowsUpdated();
	}

	function windowsUpdated ()
	{
		updateNumberOfCubes();
	}

	

	function updateWindowShape (easing = true)
	{
		// storing the actual offset in a proxy that we update against in the render function
		sceneOffsetTarget = {x: -window.screenX, y: -window.screenY};
		if (!easing) sceneOffset = sceneOffsetTarget;
	}


	function render ()
	{
		let t = getTime();

		windowManager.update();


		// calculate the new position based on the delta between current offset and new offset times a falloff value (to create the nice smoothing effect)
		let falloff = .05;
		sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
		sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);

		// set the world position to the offset
		world.position.x = sceneOffset.x;
		world.position.y = sceneOffset.y;

		let wins = windowManager.getWindows();


		// loop through all our cubes and update their positions based on current window positions
		for (let i = 0; i < cubes.length; i++)
		{
			let cube = cubes[i];
			let win = wins[i];
			let _t = t;// + i * .2;
			
			let alt = win.shape.h;
			let larg = win.shape.w;
			let posTarget = {x: win.shape.x + (larg * .5), y: win.shape.y + (alt * .5)};

			cube.position.x = cube.position.x + (posTarget.x - cube.position.x) * falloff;
			cube.position.y = cube.position.y + (posTarget.y - cube.position.y) * falloff;
			//cube.rotation.x = _t * .5;
			//cube.rotation.y = _t * .3;
		};

		renderer.render(scene, camera);
		requestAnimationFrame(render);
	}


	// resize the renderer to fit the window size
	function resize ()
	{
		let width = window.innerWidth;
		let height = window.innerHeight
		
		camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
		camera.updateProjectionMatrix();
		renderer.setSize( width, height );
	}



	function updateNumberOfCubes() {
		let wins = windowManager.getWindows();
	
		// remove all spheres
		cubes.forEach((c) => {
			world.remove(c);
		})
	
		cubes = [];
	
		// add new sphere made of particles based on the current window setup
		for (let i = 0; i < wins.length; i++) {
			let win = wins[i];
	
			let c = new t.Color();
			c.setHSL(i * 0.1, 1.0, 0.5);
			
			let radius = 100;
			let numParticles = 100;

			let geometry = new t.BoxGeometry( radius/2, radius/2, radius/2); 
			let material = new t.MeshBasicMaterial( { color: c , wireframe: true} ); 
			let cube = new t.Mesh( geometry, material ); 
	

			// Crea un BufferGeometry per la sfera
			let sphereGeometry = new t.BufferGeometry();
			let positions = [];

			for (let i = 0; i < numParticles; i++) {
				let theta = Math.random() * Math.PI * 2;
				let phi = Math.acos(2 * Math.random() - 1);

				let x = radius * Math.sin(phi) * Math.cos(theta);
				let y = radius * Math.sin(phi) * Math.sin(theta);
				let z = radius * Math.cos(phi);

				positions.push(x, y, z);
			}

			sphereGeometry.setAttribute('position', new t.Float32BufferAttribute(positions, 3));

			// Crea il materiale per le particelle
			let particleMaterial = new t.PointsMaterial({ color: c, size: 1 });

			// Crea il sistema di particelle
			let particleSystem = new t.Points(sphereGeometry, particleMaterial);


			
			var singleGeometry = new t.Geometry();

			singleGeometry.mergeMesh(cube);
			singleGeometry.mergeMesh(new t.Mesh((new t.SphereGeometry(radius, 16, 32)), material));

			var atom = new t.Mesh(singleGeometry, material);

			world.add(atom);
			cubes.push(atom);
		}
	}


}