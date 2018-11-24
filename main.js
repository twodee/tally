var cellSize = 50;
var resolution = 10;
var svgNamespace = "http://www.w3.org/2000/svg";
var cells = [];
var operands = [0, 0];
var cellOnColors = ['#FF6F5E', '#7380FF'];
var cellOffColor = 'rgb(230, 230, 230)';
var cellTextColor = 'rgb(100, 100, 100)';
var guessBox = null;
var root = null;
var padding = 5;
var fontSize;
var integerPattern = /^\d+$/;
var max = 100;
var tailIndex = null;

function onReady() {
  var svg = document.getElementById('svg');
  root = document.getElementById('root');
  guessBox = document.getElementById('guessBox');

  cellSize = root.offsetWidth / resolution;
  fontSize = cellSize * 0.3;
  var radius = cellSize / 13;
  padding = cellSize / 26;

  svg.setAttribute('viewBox', '0 0 ' + (cellSize * resolution) + ' ' + (cellSize * resolution));

  for (var r = 0; r < resolution; ++r) {
    for (var c = 0; c < resolution; ++c) {
      var cell = document.createElementNS(svgNamespace, 'rect');
      var i = r * resolution + c;
      cell.addEventListener('click', onClick(i));
      cell.addEventListener('mouseenter', onHover(i));
      cell.addEventListener('mouseleave', onUnhover(i));
      cell.setAttribute('x', c * cellSize + padding);
      cell.setAttribute('y', r * cellSize + padding);
      cell.setAttribute('width', cellSize - 2 * padding);
      cell.setAttribute('height', cellSize - 2 * padding);
      cell.setAttribute('rx', radius);
      cell.setAttribute('ry', radius);
      cell.setAttribute('fill', cellOffColor);
      cells.push(cell);
      svg.appendChild(cell);
    }
  }

  guessBox.addEventListener('keyup', onKeyUp);

  resize();

  window.addEventListener('resize', resize);
  guessBox.addEventListener('blur', function() {
    guessBox.focus();
  });
}

function resize() {
}

function onKeyUp(event) {
  if (event.which == 13 && guessBox.value != '') {
    checkGuess();
  }
}

function checkGuess() {
  var guess;
  if (integerPattern.test(guessBox.value)) {
    guess = parseInt(guessBox.value);
  } else {
    guess = 0;
  }

  if (guess == operands[0] + operands[1]) {
    hidePrompt();
    next();
  } else {
    shakeGuess(guess);
  }
}

function shakeGuess(guess) {
  var elapsedTime = 0;
  var amplitude = root.offsetWidth / resolution / 6;
  var lambda = 0.95;
  var frequency = 30;
  var startMillis = new Date().getTime();
  var targetMillis = 3 * Math.PI / 20 * 1000;

  var oldX = guessBox.style.left;
  var oldY = guessBox.style.top;

  oldX = parseFloat(oldX.substring(0, oldX.length - 2));
  oldY = parseFloat(oldY.substring(0, oldY.length - 2));

  var bounds = guessBox.getBoundingClientRect();
  guessBox.disabled = true;

  var task = setInterval(() => {
    var elapsedMillis = new Date().getTime() - startMillis;
    if (elapsedMillis > targetMillis) {
      clearInterval(task);
      guessBox.disabled = false;
      guessBox.style.left = oldX + 'px';
      guessBox.value = '';
      guessBox.focus();
    } else { 
      var intensity = amplitude * Math.exp(-lambda * elapsedMillis / 1000) * Math.cos(frequency * elapsedMillis / 1000 - Math.PI * 0.5);
      guessBox.style.left = (oldX + intensity) + 'px';
    }
  }, 10);
}

function next() {
  hidePrompt();
  erase();
}

function generateNewOperands() {
  // 81-90, 1-10
  // 71-80, 1-20
  // 61-70, 1-30

  // If max is 100, pick a number less than 90.
  operands[0] = Math.floor((max - 80) * Math.random()) + 1;
  var bigger10 = roundUpTens(operands[0]);
  operands[1] = Math.floor((max - bigger10) * Math.random()) + 1;
}

function hidePrompt() {
  isPrompting = false;
  guessBox.style.display = 'none';
}

function erase() {
  var bigger = Math.max(operands[0], operands[1]);
  var i = 0;
  var task = setInterval(() => {
    if (i >= bigger) {
      clearInterval(task);
      generateNewOperands();
      fill();
      // setTimeout(fill, 2000);
    } else { 
      if (i < operands[0]) {
        cells[tailIndex - i].setAttribute('fill', cellOffColor);
      }
      if (i < operands[1]) {
        cells[i + max - operands[1]].setAttribute('fill', cellOffColor);
      }
    }
    i += 1;
  }, 10);
}

function whichOperand(i) {
  if (i <= tailIndex && tailIndex - i < operands[0]) {
    return 0;
  } else if (max - i <= operands[1]) {
    return 1;
  } else {
    return -1;
  }
}

function cellToValue(i) {
  if (i <= tailIndex) {
    return operands[0] - (tailIndex - i);
  } else {
    return max - i;
  }
}

function isFringe(value, operandIndex) {
  var bigger10 = roundUpTens(operands[operandIndex])
  return value > bigger10 - 10 && operands[operandIndex] < bigger10;
}

function onClick(i) {
  return () => {
  }
}

function onHover(i) {
  return () => {
    var value = cellToValue(i);
    var operandIndex = whichOperand(i);

    // if in first operand and there's room below
    if (operandIndex == 0 && isFringe(value, 0)) {
      cells[i].style.cursor = 's-resize';
    }

    // if in second operand and there's room above
    if (operandIndex == 1 && isFringe(value, 1)) {
      cells[i].style.cursor = 'n-resize';
    }
  };
}

function onUnhover(i) {
  return () => {
    cells[i].style.cursor = 'default'; 
  };
}

function fill() {
  var i = 0;
  var task = setInterval(() => {
    if (i >= operands[1]) {
      clearInterval(task);
      setTimeout(drop, 200);
    } else {
      cells[max - 1 - i].setAttribute('fill', cellOnColors[1]);
    }
    i += 1;
  }, 10);
}

function roundUpTens(x) {
  return 10 * Math.ceil(x / 10);
}

function drop() {
  var nrows = (max - roundUpTens(operands[1])) / 10; // (max - roundUpTens(operands[0]) - roundUpTens(operands[1])) / 10;
  tailIndex = (operands[0] - 1) % 10 - 10;

  var r = 0;
  var task = setInterval(() => {
    if (r >= nrows) {
      clearInterval(task);
      showPrompt();
    } else {
      tailIndex += 10;
      for (var i = 0; i <= tailIndex; ++i) {
        if (whichOperand(i) < 0) {
          cells[i].setAttribute('fill', cellOffColor);
        } else {
          cells[i].setAttribute('fill', cellOnColors[0]);
        }
      }
    }
    r += 1;
  }, 100);
}

function showPrompt() {
  isPrompting = true;
  guessBox.value = '';
  guessBox.style.display = 'block';
  guessBox.focus();
}

function lerp(currentMillis, targetMillis, oldValue, newValue) {
  var proportion = currentMillis / targetMillis;
  return oldValue + proportion * (newValue - oldValue);
}

function easeBackInOut(currentMillis, targetMillis, oldValue, newValue) {
  var s = 1.70158;
  var u = s * 1.525;
  var t = currentMillis / (0.5 * targetMillis);
  if (t < 1) {
    return (newValue - oldValue) * 0.5 * t * t * ((u + 1) * t - u) + oldValue;
  } else {
    t -= 2.0;
    return (newValue - oldValue) * 0.5 * (t * t * ((u + 1) * t + u) + 2) + oldValue;
  }
}

function easeQuadInOut(currentMillis, targetMillis, oldValue, newValue) {
  var t = currentMillis / (0.5 * targetMillis);
  if (t < 1) {
    return (newValue - oldValue) * 0.5 * t * t + oldValue;
  } else {
    t -= 1.0;
    return (newValue - oldValue) * -0.5 * (t * (t - 2) - 1) + oldValue;
  }
}

window.addEventListener('load', onReady);
