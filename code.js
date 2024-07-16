document.addEventListener("DOMContentLoaded", function () {
  const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint,
    Events = Matter.Events,
    Common = Matter.Common;

  const canvasContainer = document.getElementById("canvas");

  // create an engine
  const engine = Engine.create();

  // create a renderer
  const render = Render.create({
    element: canvasContainer,
    engine: engine,
    options: {
      width: 300, // specify width of render area
      height: 600, // specify height of render area
      background: "#222", // dark blue background color
      wireframes: false,
    },
  });

  // collision categories
  const defaultCategory = 0x0001;
  const topBoxCategory = 0x0002;

  // create the box with an open top and a top box for spawning balls
  const boxLeft = Bodies.rectangle(0, 400, 20, 400, { isStatic: true }); // left
  const boxRight = Bodies.rectangle(300, 400, 20, 400, { isStatic: true }); // right
  const boxBottom = Bodies.rectangle(150, 600, 300, 20, { isStatic: true }); // bottom

  const topBoxTop = Bodies.rectangle(150, 50, 300, 100, {
    isStatic: true,
    collisionFilter: {
      category: topBoxCategory,
    },
  });

  // add all of the bodies to the world
  Composite.add(engine.world, [boxLeft, boxRight, boxBottom, topBoxTop]);

  // run the renderer
  Render.run(render);

  // create runner
  const runner = Runner.create();

  // run the engine
  Runner.run(runner, engine);

  // add mouse and touch control
  const mouse = Mouse.create(render.canvas);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
  });
  Composite.add(engine.world, mouseConstraint);
  render.mouse = mouse;

  // handle both mouse click and touch events to spawn a ball
  function spawnBall(x, y) {
    if (y <= 100) {
      // check if the click is inside the top box area
      const sizes = [20, 35, 50];
      const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
      const newBall = createBall(x, y, randomSize);
      Composite.add(engine.world, newBall);
    }
  }

  // add event listener for clicking to spawn a ball
  render.canvas.addEventListener("mousedown", function (event) {
    spawnBall(event.offsetX, event.offsetY);
  });

  // add event listener for touch to spawn a ball
  render.canvas.addEventListener("touchstart", function (event) {
    event.preventDefault(); // Prevent default touch behavior (e.g., scrolling)
    const touch = event.touches[0];
    spawnBall(
      touch.clientX - canvasContainer.getBoundingClientRect().left,
      touch.clientY - canvasContainer.getBoundingClientRect().top
    );
  });

  // function to get color based on size
  function getColor(radius) {
    if (radius <= 20) return "red";
    if (radius <= 35) return "orange";
    if (radius <= 50) return "yellow";
    if (radius <= 65) return "green";
    if (radius <= 80) return "blue";
    if (radius <= 85) return "purple";
    if (radius <= 100) return "pink";
    return "red";
  }

  // function to create a ball
  function createBall(x, y, radius) {
    const density = 0.001 * radius ** 2; // increase density with radius

    const ball = Bodies.circle(x, y, radius, {
      inertia: Infinity, // make inertia infinite for stability
      density: density,
      restitution: 0,
      friction: 0.001, // higher friction for stability
      frictionAir: 0,
      render: {
        fillStyle: getColor(radius),
      },
      collisionFilter: {
        mask: defaultCategory, // avoid collisions with top box
      },
    });

    // set initial position and angle to prevent initial movement
    Matter.Body.setPosition(ball, { x: x, y: y });
    Matter.Body.setAngle(ball, 0);

    return ball;
  }

  // Flag to prevent combining during delay
  let combining = false;

  // function to combine two balls
  function combineBalls(ballA, ballB) {
    if (combining) {
      return; // Exit if already combining
    }

    combining = true; // Set combining flag

    const combinedRadius = ballA.circleRadius + 15; // increase radius by 15
    if (combinedRadius >= 110) {
      Composite.remove(engine.world, ballA);
      Composite.remove(engine.world, ballB);
      combining = false; // Reset flag
      return;
    }

    // Temporarily change render style to white
    ballA.render.fillStyle = "white";
    ballB.render.fillStyle = "white";

    setTimeout(() => {
      // Reset render style after 0.1s delay
      ballA.render.fillStyle = getColor(ballA.circleRadius);
      ballB.render.fillStyle = getColor(ballB.circleRadius);

      // Calculate midpoint
      const midX = (ballA.position.x + ballB.position.x) / 2;
      const midY = (ballA.position.y + ballB.position.y) / 2;

      const combinedBall = createBall(midX, midY, combinedRadius);

      Composite.remove(engine.world, ballA);
      Composite.remove(engine.world, ballB);
      Composite.add(engine.world, combinedBall);

      combining = false; // Reset flag after combining
    }, 100); // 100 milliseconds (0.1s) delay
  }

  // collision event listener
  Events.on(engine, "collisionStart", function (event) {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      if (bodyA.label === "Circle Body" && bodyB.label === "Circle Body") {
        if (bodyA.circleRadius === bodyB.circleRadius) {
          combineBalls(bodyA, bodyB);
        }
      }
    }
  });
});
