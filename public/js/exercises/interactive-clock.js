export function setupInteractiveClock() {
  const clock = document.getElementById('interactive-clock');
  const hourHand = document.getElementById('hour-hand');
  const hourHandHitbox = document.getElementById('hour-hand-hitbox');
  const minuteHand = document.getElementById('minute-hand');
  const minuteHandHitbox = document.getElementById('minute-hand-hitbox');
  const textOutput = document.getElementById('clock-text-output');

  if (!clock || !hourHand || !minuteHand || !textOutput) return;

  let isDragging = false;
  let currentHour = 12;
  let currentMinutes = 0;

  const updateClock = (hour, minutes) => {
    let finalMinutes = minutes;
    if (finalMinutes >= 60) finalMinutes = 59;
    if (finalMinutes < 0) finalMinutes = 0;

    currentHour = hour;
    currentMinutes = finalMinutes;

    const hourAngle = (hour % 12) * 30 + finalMinutes * 0.5;
    const minuteAngle = finalMinutes * 6;

    hourHand.setAttribute('transform', `rotate(${hourAngle}, 100, 100)`);
    hourHandHitbox.setAttribute('transform', `rotate(${hourAngle}, 100, 100)`);
    minuteHand.setAttribute('transform', `rotate(${minuteAngle}, 100, 100)`);
    minuteHandHitbox.setAttribute('transform', `rotate(${minuteAngle}, 100, 100)`);

    updateClockText(finalMinutes, hour);
  };

  const updateClockText = (minutes, hour) => {
    const germanHours = ['zwölf','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn','elf'];
    let text = 'Es ist ';

    const roundedMinutes = Math.round(minutes / 5) * 5;

    const nextHour = (hour % 12) + 1;
    const nextHourText = germanHours[nextHour === 13 ? 1 : nextHour];
    const currentHourText = germanHours[hour % 12];

    switch (roundedMinutes) {
      case 0: text += `${currentHourText} Uhr.`; break;
      case 5: text += `fünf nach ${currentHourText}.`; break;
      case 10: text += `zehn nach ${currentHourText}.`; break;
      case 15: text += `Viertel nach ${currentHourText}.`; break;
      case 20: text += `zwanzig nach ${currentHourText}.`; break;
      case 25: text += `fünf vor halb ${nextHourText}.`; break;
      case 30: text += `halb ${nextHourText}.`; break;
      case 35: text += `fünf nach halb ${nextHourText}.`; break;
      case 40: text += `zwanzig vor ${nextHourText}.`; break;
      case 45: text += `Viertel vor ${nextHourText}.`; break;
      case 50: text += `zehn vor ${nextHourText}.`; break;
      case 55: text += `fünf vor ${nextHourText}.`; break;
      default: text += `${currentHourText} Uhr.`;
    }
    textOutput.textContent = text;
  };

  const getAngle = (e) => {
    const rect = clock.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return angle;
  };

  const startMinuteDrag = (e) => {
    e.preventDefault();
    isDragging = true;
    document.addEventListener('mousemove', onMinuteDrag);
    document.addEventListener('touchmove', onMinuteDrag, { passive: false });
    document.addEventListener('mouseup', endMinuteDrag);
    document.addEventListener('touchend', endMinuteDrag);
  };

  const onMinuteDrag = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const angle = getAngle(e);
    let minutes = Math.round((angle / 360) * 60) % 60;
    updateClock(currentHour, minutes);
  };

  const endMinuteDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    document.removeEventListener('mousemove', onMinuteDrag);
    document.removeEventListener('touchmove', onMinuteDrag);
    document.removeEventListener('mouseup', endMinuteDrag);
    document.removeEventListener('touchend', endMinuteDrag);
  };

  const startHourDrag = (e) => {
    e.preventDefault();
    isDragging = true;
    document.addEventListener('mousemove', onHourDrag);
    document.addEventListener('touchmove', onHourDrag, { passive: false });
    document.addEventListener('mouseup', endHourDrag);
    document.addEventListener('touchend', endHourDrag);
  };

  const onHourDrag = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const angle = getAngle(e);
    let hour = Math.round(angle / 30);
    if (hour === 0) hour = 12;
    updateClock(hour, currentMinutes);
  };

  const endHourDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    document.removeEventListener('mousemove', onHourDrag);
    document.removeEventListener('touchmove', onHourDrag);
    document.removeEventListener('mouseup', endHourDrag);
    document.removeEventListener('touchend', endHourDrag);
  };

  minuteHandHitbox.addEventListener('mousedown', startMinuteDrag);
  minuteHandHitbox.addEventListener('touchstart', startMinuteDrag, { passive: false });
  hourHandHitbox.addEventListener('mousedown', startHourDrag);
  hourHandHitbox.addEventListener('touchstart', startHourDrag, { passive: false });

  updateClock(12, 0);
}
