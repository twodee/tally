var cellSize = 50;
var resolution = 10;
var svgNamespace = "http://www.w3.org/2000/svg";
var cells = [];
var operands = [0, 0];
var cellColors = ['rgb(230, 230, 230)', '#FF6F5E', '#7380FF'];
var cellTextColor = 'rgb(100, 100, 100)';
var guessBox = null;
var root = null;
var padding = 5;
var fontSize;
var integerPattern = /^\d+$/;
var max = 100;
var tailIndex = null;
var isLocked = false;
var overlay = null;

function onReady() {
  var svg = document.getElementById('svg');
  root = document.getElementById('root');
  guessBox = document.getElementById('guessBox');
  overlay = document.getElementById('overlay');

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
      cells.push({svg: cell, state: 0});
      svg.appendChild(cell);
    }
  }

  guessBox.addEventListener('keyup', onKeyUp);

  resize();

  window.addEventListener('resize', resize);
  guessBox.addEventListener('blur', function() {
    guessBox.focus();
  });

  synchronizeCells();
}

function synchronizeCells() {
  cells.forEach(cell => {
    cell.svg.setAttribute('fill', cellColors[cell.state]);
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
  isLocked = true;
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

  operands = [7, 88];
  console.log("operands:", operands);
}

function hidePrompt() {
  isPrompting = false;
  guessBox.style.display = 'none';
}

function erase() {
  // var bigger = Math.max(operands[0], operands[1]);
  // var i = 0;
  var nrows = roundUpTens(operands[0] + operands[1]) / 10;
  var r = 0;
  var soFar = operands[1];
  var task = setInterval(() => {
    if (r > nrows) {
      clearInterval(task);
      generateNewOperands();
      fill();
      // setTimeout(fill, 2000);
    } else { 
      // Clear out old top row of operand 1.
      for (var i = 0; i < soFar % 10; ++i) {
        cells[max - soFar + i].state = 0;
      }

      // Clear out prefix of new top row.
      if (soFar > 10) {
        soFar -= 10;
        var complement = 10 - soFar % 10;
        for (var i = 0; i < complement; ++i) {
          cells[max - soFar - i - 1].state = 0;
        }
      }

      // Clear out old top row of operand 0.
      if (tailIndex - operands[0] + 1 < max) {
        for (var i = 0; i < 10; ++i) {
          cells[tailIndex - operands[0] + 1 + i].state = 0;
        }

        // Fill in new bottom row of operand 0.
        tailIndex += 10;
        for (var i = 0; i < operands[0]; ++i) {
          if (tailIndex - i < max) {
            cells[tailIndex - i].state = 1;
          }
        }
      }
    }
    r += 1;
  }, 100);
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
    if (isLocked) {
      return;
    }

    var r = Math.floor(i / 10);
    var c = i % 10;

    // if in first operand and there's room below
    if (isDownwardlyMobile(cells[i], r, c)) {
      cells[i].svg.style.cursor = 'default';
      migrateCellDown(r, c);
    } else if (isUpwardlyMobile(cells[i], r, c)) {
      cells[i].svg.style.cursor = 'default';
      migrateCellUp(r, c);
    }
  }
}

function executeTasks(tasks, i = 0) {
  if (i < tasks.length) {
    setTimeout(() => {
      tasks[i]();
      synchronizeCells();
      executeTasks(tasks, i + 1);
    }, 50);
  }
}

function migrateCellDown(r, c) {
  isLocked = true;
  overlay.style.display = 'block';
  var tasks = [];

  var dropClicked = () => {
    cellAt(r + 1, c).state = 1;
    cellAt(r, c).state = 1;
    cellAt(r, (operands[0] - 1) % 10).state = 0;
  };
  tasks.push(dropClicked);

  for (var cPrime = c + 1; cellAt(r + 1, cPrime).state == 0; ++cPrime) {
    var shift = ((cPrime) => () => {
      cellAt(r + 1, cPrime - 1).state = 0;
      cellAt(r + 1, cPrime).state = 1;
    })(cPrime);
    tasks.push(shift);
  }

  var swapOperands = () => {
    operands[0] -= 1;
    operands[1] += 1;
    cellAt(r + 1, cPrime - 1).state = 2;
    tailIndex -= 1;
    isLocked = false;
    overlay.style.display = 'none';
  };
  tasks.push(swapOperands);

  executeTasks(tasks);
}

function migrateCellUp(r, c) {
  isLocked = true;
  overlay.style.display = 'display';
  var tasks = [];

  var dropClicked = () => {
    cellAt(r - 1, c).state = 2;
    cellAt(r, c).state = 2;
    cellAt(r, 9 - (operands[1] - 1) % 10).state = 0;
  };
  tasks.push(dropClicked);

  for (var cPrime = c - 1; cellAt(r - 1, cPrime).state == 0; --cPrime) {
    var shift = ((cPrime) => () => {
      cellAt(r - 1, cPrime + 1).state = 0;
      cellAt(r - 1, cPrime).state = 2;
    })(cPrime);
    tasks.push(shift);
  }

  var swapOperands = () => {
    operands[1] -= 1;
    operands[0] += 1;
    cellAt(r - 1, cPrime + 1).state = 1;
    tailIndex += 1;
    isLocked = false;
    overlay.style.display = 'none';
  };
  tasks.push(swapOperands);

  executeTasks(tasks, 0);
}

function cellAt(r, c) {
  return cells[r * 10 + c];
}

function isUpwardlyMobile(cell, r, c) {
  return r > 0 && cell.state == 2 && cellAt(r - 1, c).state == 0 && cellAt(r - 1, 0).state == 1;
}

function isDownwardlyMobile(cell, r, c) {
  return r < 9 && cell.state == 1 && cellAt(r + 1, c).state == 0 && cellAt(r + 1, 9).state == 2;
}

function onHover(i) {
  return () => {
    console.log("hi");
    if (isLocked) {
      return;
    }

    var r = Math.floor(i / 10);
    var c = i % 10;

    if (isDownwardlyMobile(cells[i], r, c)) {
      cells[i].svg.style.cursor = 's-resize';
    } else if (isUpwardlyMobile(cells[i], r, c)) {
      cells[i].svg.style.cursor = 'n-resize';
    }
  };
}

function onUnhover(i) {
  return () => {
    cells[i].svg.style.cursor = 'default'; 
  };
}

function fill() {
  var r = 0;
  var soFar = operands[1] % 10;
  var task = setInterval(() => {
    if (soFar > operands[1]) {
      clearInterval(task);
      setTimeout(drop, 200);
    } else {
      for (var i = 0; i < soFar; ++i) {
        cells[max - 1 - i].state = 2;
      }
      synchronizeCells();
      soFar += 10;
    }
  }, 100);
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
          cells[i].state = 0;
        } else {
          cells[i].state = 1;
        }
      }
      synchronizeCells();
      r += 1;
    }
  }, 100);
}

function showPrompt() {
  isPrompting = true;
  guessBox.value = '';
  guessBox.style.display = 'block';
  guessBox.focus();
  isLocked = false;
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
