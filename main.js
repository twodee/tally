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
var max = resolution * resolution;
var tailIndex = null;
var isLocked = false;
var overlay = null;
var labelOperand0 = null;
var labelOperand1 = null;
var labelOriginalOperand0 = null;
var labelOriginalOperand1 = null;
var labelPlus = null;
var originalProblemRoot = null;
var terminalCellLabels = [];
var star = null;
var questionLabel = null;
var problemRoot = null;

function onReady() {
  var svg = document.getElementById('svg');
  root = document.getElementById('root');
  guessBox = document.getElementById('guessBox');
  overlay = document.getElementById('overlay');
  labelOperand0 = document.getElementById('operand0');
  labelOperand1 = document.getElementById('operand1');
  labelOriginalOperand0 = document.getElementById('originalOperand0');
  labelOriginalOperand1 = document.getElementById('originalOperand1');
  originalProblemRoot = document.getElementById('originalProblem');
  labelPlus = document.getElementById('plus');
  star = document.getElementById('star');
  questionLabel = document.getElementById('question');
  problemRoot = document.getElementById('problem');

  labelOperand0.style.color = cellColors[1];
  labelOperand1.style.color = cellColors[2];

  cellSize = root.offsetWidth / resolution;
  fontSize = cellSize * 0.3;
  var radius = cellSize / 13;
  padding = cellSize / 26;

  svg.setAttribute('viewBox', '0 0 ' + (cellSize * resolution) + ' ' + (cellSize * resolution));
  svg.setAttribute('preserveAspectRatio', 'xMinYMid');

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

  for (var i = 0; i < 2; ++i) {
    var label = document.createElementNS(svgNamespace, 'text');
    label.setAttribute('class', 'terminal');
    label.setAttribute('x', 0);
    label.setAttribute('y', 0);
    label.setAttribute('font-size', fontSize);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', cellTextColor);
    label.setAttribute('alignment-baseline', 'central');
    label.setAttribute('dominant-baseline', 'central');
    label.setAttribute('opacity', 0);
    label.textContent = '#';
    svg.appendChild(label);
    terminalCellLabels.push(label);
  }

  guessBox.addEventListener('keyup', onKeyUp);

  resize();

  window.addEventListener('resize', resize);
  guessBox.addEventListener('blur', function() {
    guessBox.focus();
  });

  problemRoot.style.display = 'block';
  hideProblem();
  synchronizeCells();
  next();
}

function synchronizeCells() {
  cells.forEach(cell => {
    cell.svg.setAttribute('fill', cellColors[cell.state]);
  });
}

function showTerminalCell(iOperand, iCell) {
  if (operands[iOperand] == 0) {
    terminalCellLabels[iOperand].setAttribute('opacity', 0);
  } else {
    var r = Math.floor(iCell / resolution);
    var c = iCell % resolution;
    terminalCellLabels[iOperand].setAttribute('x', (c + 0.5) * cellSize);
    terminalCellLabels[iOperand].setAttribute('y', (r + 0.5) * cellSize);
    terminalCellLabels[iOperand].setAttribute('opacity', 1);
    terminalCellLabels[iOperand].textContent = operands[iOperand];
  }
}

function resize() {
}

function onKeyUp(event) {
  if (event.which == 13 && guessBox.value != '') {
    checkGuess();
  }
  showQuestion();
}

function checkGuess() {
  var guess;
  if (integerPattern.test(guessBox.value)) {
    guess = '';
    for (var i = guessBox.value.length - 1; i >= 0; --i) {
      guess += guessBox.value[i];
    }
    guess = parseInt(guess);
  } else {
    guess = 0;
  }

  if (guess == operands[0] + operands[1]) {
    guessBox.disabled = true;
    star.style.display = 'block';
    setTimeout(() => {
      star.style.display = 'none';
      guessBox.disabled = false;
      hideProblem();
      next();
    }, 3000);
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

  // TODO: why do I need getComputedStyle? The properties are set literally in the CSS.
  var style = window.getComputedStyle(guessBox);
  var oldX = style.left;
  var oldY = style.top;

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
      showQuestion();
    } else { 
      var intensity = amplitude * Math.exp(-lambda * elapsedMillis / 1000) * Math.cos(frequency * elapsedMillis / 1000 - Math.PI * 0.5);
      guessBox.style.left = (oldX + intensity) + 'px';
    }
  }, 10);
}

function next() {
  lock();
  hideProblem();
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
  // operands = [60, 1];
  labelOriginalOperand0.innerText = operands[0];
  labelOriginalOperand1.innerText = operands[1];
  synchronizeProblemLabels();
}

function synchronizeProblemLabels() {
  labelOperand0.innerText = operands[0];
  labelOperand1.innerText = operands[1];
}

function hideProblem() {
  originalProblemRoot.style.display = 'none';
  labelPlus.style.display = 'none';
  guessBox.style.visibility = 'hidden';
  labelOperand0.style.visibility = 'hidden';
  labelOperand1.style.visibility = 'hidden';
  terminalCellLabels[0].setAttribute('opacity', 0);
  terminalCellLabels[1].setAttribute('opacity', 0);
}

function erase() {
  var nrows = roundUpTens(operands[0] + operands[1]) / 10;
  var r = 0;
  var soFar = operands[1];
  var task = setInterval(() => {
    if (r > nrows) {
      clearInterval(task);
      generateNewOperands();
      fill();
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
      r += 1;
      synchronizeCells();
    }
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
    } else if (isLeftwardlyMobile(cells[i], r, c)) {
      cells[i].svg.style.cursor = 'default';
      migrateCellLeft(r, c);
    } else if (isRightwardlyMobile(cells[i], r, c)) {
      cells[i].svg.style.cursor = 'default';
      migrateCellRight(r, c);
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

function lock() {
  isLocked = true;
  overlay.style.display = 'block';
}

function unlock() {
  isLocked = false;
  overlay.style.display = 'none';
}

function migrateCellLeft(r, c) {
  lock();
  var tasks = [];

  var pushClicked = () => {
    operands[1] -= 1;
    showTerminalCell(1, max - operands[1]);
  };
  tasks.push(pushClicked);

  for (var cPrime = c - 1; cellAt(r, cPrime).state == 0; --cPrime) {
    var shift = ((cPrime) => () => {
      cellAt(r, cPrime + 1).state = 0;
      cellAt(r, cPrime).state = 1;
    })(cPrime);
    tasks.push(shift);
  }

  var swapOperands = () => {
    operands[0] += 1;
    tailIndex += 1;
    cellAt(r, cPrime + 1).state = 1;
  };
  tasks.push(swapOperands);

  var cleanUp = () => {
    unlock();
    originalProblemRoot.style.display = 'block';
    synchronizeProblemLabels();
    showTerminalCell(0, tailIndex);
    showTerminalCell(1, cells.length - operands[1]);
  };
  tasks.push(cleanUp);

  executeTasks(tasks);
}

function migrateCellRight(r, c) {
  lock();
  var tasks = [];

  var pushClicked = () => {
    operands[0] -= 1;
    tailIndex -= 1;
    showTerminalCell(0, tailIndex);
  };
  tasks.push(pushClicked);

  for (var cPrime = c + 1; cellAt(r, cPrime).state == 0; ++cPrime) {
    var shift = ((cPrime) => () => {
      cellAt(r, cPrime - 1).state = 0;
      cellAt(r, cPrime).state = 1;
    })(cPrime);
    tasks.push(shift);
  }

  var swapOperands = () => {
    operands[1] += 1;
    cellAt(r, cPrime - 1).state = 2;
  };
  tasks.push(swapOperands);

  var cleanUp = () => {
    unlock();
    originalProblemRoot.style.display = 'block';
    synchronizeProblemLabels();
    showTerminalCell(0, tailIndex);
    showTerminalCell(1, cells.length - operands[1]);
  };
  tasks.push(cleanUp);

  executeTasks(tasks);
}

function migrateCellDown(r, c) {
  lock();
  var tasks = [];

  var dropClicked = () => {
    cellAt(r + 1, c).state = 1;
    cellAt(r, c).state = 1;
    cellAt(r, (operands[0] - 1) % 10).state = 0;
    operands[0] -= 1;
    tailIndex -= 1;
    showTerminalCell(0, tailIndex);
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
    operands[1] += 1;
    cellAt(r + 1, cPrime - 1).state = 2;
  };
  tasks.push(swapOperands);
 
  // If we're about to wipe an entire row, shift everything down.
  if ((operands[0] - 1) % 10 == 0 && operands[0] - 1 > 0) {
    var invoid = () => {
      for (var rPrime = r; rPrime > 0; --rPrime) {
        for (var c = 0; c < 10; ++c) {
          cellAt(rPrime, c).state = cellAt(rPrime - 1, c).state;
        }
      }
      for (var c = 0; c < 10; ++c) {
        cellAt(0, c).state = 0;
      }
      tailIndex += 10;
      showTerminalCell(0, tailIndex);
    };
    tasks.push(invoid);
  }

  var cleanUp = () => {
    originalProblemRoot.style.display = 'block';
    synchronizeProblemLabels();
    showTerminalCell(0, tailIndex);
    showTerminalCell(1, cells.length - operands[1]);
    unlock();
  };
  tasks.push(cleanUp);

  executeTasks(tasks);
}

function migrateCellUp(r, c) {
  lock();
  var tasks = [];

  var dropClicked = () => {
    cellAt(r - 1, c).state = 2;
    cellAt(r, c).state = 2;
    cellAt(r, 9 - (operands[1] - 1) % 10).state = 0;
    operands[1] -= 1;
    showTerminalCell(1, cells.length - operands[1]);
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
    operands[0] += 1;
    cellAt(r - 1, cPrime + 1).state = 1;
    tailIndex += 1;
  };
  tasks.push(swapOperands);
 
  // If we're about to wipe an entire row, shift everything down.
  if ((operands[1] - 1) % 10 == 0 && operands[1] - 1 > 0) {
    var invoid = () => {
      for (var rPrime = r; rPrime > 0; --rPrime) {
        for (var c = 0; c < 10; ++c) {
          cellAt(rPrime, c).state = cellAt(rPrime - 1, c).state;
        }
      }
      for (var c = 0; c < 10; ++c) {
        cellAt(0, c).state = 0;
      }
      tailIndex += 10;
      showTerminalCell(0, tailIndex);
    };
    tasks.push(invoid);
  }

  var cleanUp = () => {
    unlock();
    originalProblemRoot.style.display = 'block';
    synchronizeProblemLabels();
    showTerminalCell(0, tailIndex);
    showTerminalCell(1, cells.length - operands[1]);
  };
  tasks.push(cleanUp);

  executeTasks(tasks);
}

function cellAt(r, c) {
  return cells[r * 10 + c];
}

function isRightwardlyMobile(cell, r, c) {
  return cell.state == 1 && cellAt(r, 9).state == 2 && c < 9 && cellAt(r, c + 1).state != 1;
}

function isLeftwardlyMobile(cell, r, c) {
  return cell.state == 2 && cellAt(r, 0).state == 1 && c > 0 && cellAt(r, c - 1).state != 2;
}

function isUpwardlyMobile(cell, r, c) {
  return r > 0 && cell.state == 2 && cellAt(r - 1, c).state == 0 && cellAt(r - 1, 0).state == 1 && cellAt(r - 1, 9).state == 0;
}

function isDownwardlyMobile(cell, r, c) {
  return r < 9 && cell.state == 1 && cellAt(r + 1, c).state == 0 && cellAt(r + 1, 9).state == 2 && cellAt(r + 1, 0).state == 0;
}

function showQuestion() {
  if (guessBox.selectionStart == guessBox.selectionEnd) {
    if (guessBox.selectionStart == 0) {
      questionLabel.innerHTML = 'How many ones?';
    } else if (guessBox.selectionStart == 1) {
      questionLabel.innerHTML = 'How many tens?';
    } else {
      questionLabel.innerHTML = '';
    }
  } else {
    questionLabel.innerHTML = '';
  }
}

function onHover(i) {
  return () => {
    if (isLocked) {
      return;
    }

    var r = Math.floor(i / 10);
    var c = i % 10;

    if (isDownwardlyMobile(cells[i], r, c)) {
      cells[i].svg.style.cursor = 's-resize';
    } else if (isUpwardlyMobile(cells[i], r, c)) {
      cells[i].svg.style.cursor = 'n-resize';
    } else if (isLeftwardlyMobile(cells[i], r, c)) {
      cells[i].svg.style.cursor = 'w-resize';
    } else if (isRightwardlyMobile(cells[i], r, c)) {
      cells[i].svg.style.cursor = 'e-resize';
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
  labelOperand1.style.visibility = 'visible';

  var task = setInterval(() => {
    if (soFar > operands[1]) {
      clearInterval(task);
      showTerminalCell(1, cells.length - operands[1]);
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
  var nrows = (max - roundUpTens(operands[1])) / 10;
  if (operands[0] % 10 + operands[1] % 10 <= 10 && operands[0] % 10 != 0 && operands[1] % 10 != 0) {
    nrows += 1;
  }
  tailIndex = (operands[0] - 1) % 10 - 10;
  labelOperand0.style.visibility = 'visible'; 

  var r = 0;
  var task = setInterval(() => {
    if (r >= nrows) {
      showTerminalCell(0, tailIndex);
      clearInterval(task);
      setTimeout(showPrompt, 1000);
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
  labelPlus.style.display = 'inline';
  guessBox.value = '';
  guessBox.style.visibility = 'visible';
  guessBox.focus();
  showQuestion();
  unlock();
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
