document.addEventListener("DOMContentLoaded", function () {
  const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Events = Matter.Events,
    Mouse = Matter.Mouse;

  const canvasContainer = document.getElementById("canvas");

  // Create an engine
  const engine = Engine.create();
  engine.positionIterations = 500;
  engine.velocityIterations = 100;

  // Create a renderer
  const render = Render.create({
    element: canvasContainer,
    engine: engine,
    options: {
      width: 300,
      height: 600,
      background: "#222",
      wireframes: false,
      showAngleIndicator: false,
    },
  });

  // Collision categories
  const defaultCategory = 0x0001;
  const topBoxCategory = 0x0002;
  const previewCategory = 0x0004; // New category for the preview ball

  // Create the box with an open top and a top box for spawning balls
  const boxLeft = Bodies.rectangle(0, 400, 20, 400, {
    isStatic: true,
    render: { fillStyle: "gray" },
    friction: 1, // Higher friction for rolling
  });

  const boxRight = Bodies.rectangle(300, 400, 20, 400, {
    isStatic: true,
    render: { fillStyle: "gray" },
    friction: 1, // Higher friction for rolling
  });

  const boxBottom = Bodies.rectangle(150, 600, 300, 20, {
    isStatic: true,
    render: { fillStyle: "gray" },
    friction: 1, // Higher friction for rolling
  });

  const topBoxTop = Bodies.rectangle(150, 50, 300, 100, {
    isStatic: true,
    collisionFilter: { category: topBoxCategory },
    render: { fillStyle: "gray" },
  });

  // Add all of the bodies to the world
  Composite.add(engine.world, [boxLeft, boxRight, boxBottom, topBoxTop]);

  // Run the renderer
  Render.run(render);

  // Create runner
  const runner = Runner.create();
  Runner.run(runner, engine);

  // Add mouse control for clicking to spawn a ball
  const mouse = Mouse.create(render.canvas);

  // Handle both mouse click and touch events to spawn a ball
  let canSpawn = true;
  let previewBall = createPreviewBall();

  function spawnBall(x, y) {
    if (canSpawn && y <= 100) {
      canSpawn = false; // Set the flag to false
      const newBall = createBall(x, y, previewBall.circleRadius);
      Composite.add(engine.world, newBall);

      // Update preview ball size
      updatePreviewBallSize();

      setTimeout(() => {
        canSpawn = true; // Reset the flag after 1 second
      }, 1000);
    }
  }

  // Add event listener for clicking to spawn a ball
  render.canvas.addEventListener("mousedown", function (event) {
    spawnBall(event.offsetX, event.offsetY);
  });

  // Add event listener for touch to spawn a ball
  render.canvas.addEventListener("touchstart", function (event) {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = canvasContainer.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    spawnBall(touchX, touchY);
  });

  // Function to get color based on size
  function getColor(radius) {
    if (radius <= 10) return "#EBEBEB";
    if (radius <= 20) return "#B5B5B5";
    if (radius <= 30) return "#EB5E28";
    if (radius <= 40) return "#F0EAD2";
    if (radius <= 50) return "#A1C181";
    if (radius <= 60) return "#277DA1";
    if (radius <= 70) return "#A3CEF1";
    if (radius <= 80) return "#C6AC8F";
    if (radius <= 90) return "#B36A5E";
    if (radius <= 100) return "#FCCA46";
    return "red";
  }

  // Function to create a ball
  function createBall(x, y, radius) {
    const area = Math.PI * radius ** 2;
    const mass = 0.05 * area;
    const density = mass / area; // Adjust based on size

    const ball = Bodies.circle(x, y, radius, {
      density: density,
      mass: mass,
      restitution: 0, // Less bouncy
      friction: 1, // Higher friction for rolling
      frictionStatic: 1, // Higher static friction
      // frictionAir: 0.001, // Minimal air resistance for realistic motion
      render: {
        fillStyle: getColor(radius),
        lineWidth: 1, // Set the stroke width
      },
      collisionFilter: { mask: defaultCategory },
    });

    Matter.Body.setPosition(ball, { x: x, y: y });
    Matter.Body.setAngle(ball, 0);

    return ball;
  }

  // Function to create a preview ball
  function createPreviewBall() {
    const sizes = [10, 20, 30];
    const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
    const previewBall = Bodies.circle(150, 25, randomSize, {
      isStatic: true,
      render: { fillStyle: getColor(randomSize) },
      collisionFilter: { category: previewCategory, mask: ~defaultCategory }, // Ensure it doesn't collide with other balls
    });

    Composite.add(engine.world, previewBall);
    return previewBall;
  }

  // Function to update preview ball size
  function updatePreviewBallSize() {
    const sizes = [10, 20, 30];
    const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
    Matter.Body.scale(
      previewBall,
      randomSize / previewBall.circleRadius,
      randomSize / previewBall.circleRadius
    );
    previewBall.circleRadius = randomSize;
    previewBall.render.fillStyle = getColor(randomSize);
  }

  let combining = false;

  // Function to combine two balls
  function combineBalls(ballA, ballB) {
    if (combining) return;

    combining = true;

    const combinedRadius = ballA.circleRadius + 10;
    if (combinedRadius >= 110) {
      Composite.remove(engine.world, ballA);
      Composite.remove(engine.world, ballB);
      combining = false;
      return;
    }

    ballA.render.fillStyle = "white";
    ballB.render.fillStyle = "white";

    setTimeout(() => {
      ballA.render.fillStyle = getColor(ballA.circleRadius);
      ballB.render.fillStyle = getColor(ballB.circleRadius);

      // Determine which ball is newer
      const newerBall = ballA.id > ballB.id ? ballA : ballB;
      const newerBallPosition = {
        x: newerBall.position.x,
        y: newerBall.position.y,
      };

      const combinedBall = createBall(
        newerBallPosition.x,
        newerBallPosition.y,
        combinedRadius
      );

      Composite.remove(engine.world, ballA);
      Composite.remove(engine.world, ballB);
      Composite.add(engine.world, combinedBall);

      combining = false;
    }, 100);
  }

  // Collision event listener
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

  // Initial update of the preview ball size
  updatePreviewBallSize();
});
