import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.Math;
import Toybox.SensorHistory;

class GarminWatchFaceView extends WatchUi.WatchFace {

    // Sleep state suppresses the 1 Hz second-hand animation in low-power mode.
    private var _isSleep as Boolean = false;
    private var _cx as Number = 130;
    private var _cy as Number = 130;

    function initialize() {
        WatchFace.initialize();
    }

    function onLayout(dc as Graphics.Dc) as Void {
        _cx = dc.getWidth() / 2;
        _cy = dc.getHeight() / 2;
    }

    function onShow() as Void {
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        // 1. Clear background (black, high contrast for transflective MIP).
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        var cx = _cx;
        var cy = _cy;
        var clockTime = System.getClockTime();

        // --- Dial Ticks: 60 minute marks, bold every 5 ---
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        for (var i = 0; i < 60; i += 1) {
            var isMajor = (i % 5 == 0);
            var angleRad = (i * 6 * Math.PI) / 180.0;
            var tickLen = isMajor ? 8 : 4;
            var r1 = 120 - tickLen;
            var r2 = 120;
            dc.setPenWidth(isMajor ? 2 : 1);
            dc.drawLine(cx + r1 * Math.sin(angleRad), cy - r1 * Math.cos(angleRad),
                        cx + r2 * Math.sin(angleRad), cy - r2 * Math.cos(angleRad));
        }

        // --- Cardinal Numerals (12 / 3 / 6 / 9) ---
        // No array allocation in onUpdate: derive the value from the loop index.
        dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
        for (var h = 0; h < 4; h += 1) {
            var val = (h == 0) ? 12 : (h * 3);           // 12, 3, 6, 9
            var a = (val * 30 * Math.PI) / 180.0;
            dc.drawText(cx + 102 * Math.sin(a), cy - 102 * Math.cos(a),
                        Graphics.FONT_TINY, val.toString(),
                        Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }

        // --- Altimeter complication (barometric elevation, meters) ---
        drawAltimeter(dc, cx, 70);

        // --- Date window ---
        drawDateWindow(dc, cx, 175);

        // --- Analog Hands ---
        var hAngle = ((clockTime.hour % 12 + clockTime.min / 60.0) * 30.0 * Math.PI) / 180.0;
        var mAngle = ((clockTime.min + clockTime.sec / 60.0) * 6.0 * Math.PI) / 180.0;

        // Hour hand (bold white)
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(5);
        dc.drawLine(cx, cy, cx + 55 * Math.sin(hAngle), cy - 55 * Math.cos(hAngle));

        // Minute hand (bold white)
        dc.setPenWidth(3);
        dc.drawLine(cx, cy, cx + 85 * Math.sin(mAngle), cy - 85 * Math.cos(mAngle));

        // Second hand (thin orange-yellow, counterweight tail + hub) — drawn only when awake.
        if (!_isSleep) {
            var sAngle = (clockTime.sec * 6.0 * Math.PI) / 180.0;
            dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
            dc.setPenWidth(1);
            dc.drawLine(cx - 18 * Math.sin(sAngle), cy + 18 * Math.cos(sAngle),
                        cx + 100 * Math.sin(sAngle), cy - 100 * Math.cos(sAngle));
            dc.fillCircle(cx, cy, 3);
        } else {
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.fillCircle(cx, cy, 4);
        }
    }

    // Barometric altimeter. SensorHistory.getElevationHistory is the only Connect IQ
    // API that exposes the onboard altimeter to a watch face (Activity.getInfo() is
    // null outside an active session; Toybox.Sensor has no pressure sensor type).
    // Requires the SensorHistory permission, declared in manifest.xml.
    function drawAltimeter(dc as Graphics.Dc, x as Number, y as Number) as Void {
        var altStr = "--";
        if ((Toybox has :SensorHistory) && (SensorHistory has :getElevationHistory)) {
            var iter = SensorHistory.getElevationHistory({:period => 1, :order => SensorHistory.ORDER_NEWEST_FIRST});
            if (iter != null) {
                var sample = iter.next();
                if (sample != null && sample.data != null) {
                    altStr = sample.data.toNumber().toString();
                }
            }
        }
        dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, y - 7, Graphics.FONT_XTINY, "ALT",
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.drawText(x, y + 7, Graphics.FONT_SMALL, altStr + "m",
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    // Classic pilot date window: framed aperture with day-of-week + month-day.
    function drawDateWindow(dc as Graphics.Dc, x as Number, y as Number) as Void {
        var info = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        var dow = info.day_of_week.toNumber();
        var dowStr = "SUNMONTUEWEDTHUFRISAT".substring((dow - 1) * 3, (dow - 1) * 3 + 3);
        var dateStr = dowStr + " " + info.month.format("%02d") + "-" + info.day.format("%02d");

        // Aperture: dark fill + yellow frame.
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_BLACK);
        dc.fillRectangle(x - 30, y - 9, 60, 18);
        dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(1);
        dc.drawRectangle(x - 30, y - 9, 60, 18);

        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, y, Graphics.FONT_XTINY, dateStr,
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    function onHide() as Void {
    }

    function onExitSleep() as Void {
        _isSleep = false;
        WatchUi.requestUpdate();
    }

    function onEnterSleep() as Void {
        _isSleep = true;
        WatchUi.requestUpdate();
    }
}
