import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;
import Toybox.ActivityMonitor;
import Toybox.SensorHistory;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.Math;

class GarminWatchFaceView extends WatchUi.WatchFace {

    private var _isSleep as Boolean = false;
    private var _screenCenter as Number = 130;

    function initialize() {
        WatchFace.initialize();
    }

    function onLayout(dc as Graphics.Dc) as Void {
        _screenCenter = dc.getWidth() / 2;
    }

    function onShow() as Void {
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        // 1. Clear background
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        var cx = _screenCenter;
        var cy = _screenCenter;
        var clockTime = System.getClockTime();
        var sysStats = System.getSystemStats();
        var actInfo = ActivityMonitor.getInfo();

        // --- Dial Ticks ---
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        for (var i = 0; i < 60; i += 1) {
            var isMajor = (i % 5 == 0);
            var angleRad = (i * 6 * Math.PI) / 180.0;
            var tickLen = isMajor ? 8 : 4;
            var r1 = 120 - tickLen;
            var r2 = 120;
            var x1 = cx + r1 * Math.sin(angleRad);
            var y1 = cy - r1 * Math.cos(angleRad);
            var x2 = cx + r2 * Math.sin(angleRad);
            var y2 = cy - r2 * Math.cos(angleRad);
            dc.setPenWidth(isMajor ? 2 : 1);
            dc.drawLine(x1, y1, x2, y2);
        }

        // --- Dial Numbers (12, 3, 6, 9) --- Zero Allocation ---
        dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
        for (var h = 0; h < 4; h += 1) {
            var val = (h == 0) ? 12 : (h * 3);
            var angle = (val * 30 * Math.PI) / 180.0;
            var nx = cx + 102 * Math.sin(angle);
            var ny = cy - 102 * Math.cos(angle);
            dc.drawText(nx, ny, Graphics.FONT_TINY, val.toString(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }

        // Complication: Altitude (#1)
        var altStr_0 = "--";
        if (Toybox has :SensorHistory && SensorHistory has :getElevationHistory) {
            var elHist_0 = SensorHistory.getElevationHistory({ :period => 1, :order => SensorHistory.ORDER_NEWEST_FIRST });
            if (elHist_0 != null) {
                var elSample_0 = elHist_0.next();
                if (elSample_0 != null && elSample_0.data != null) {
                    altStr_0 = elSample_0.data.toNumber().toString() + "m";
                }
            }
        }
        dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(130, 70, Graphics.FONT_XTINY, altStr_0, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Complication: Date (badge window) (#2)
        var now_1 = Time.now();
        var dateInfo_1 = Gregorian.info(now_1, Time.FORMAT_SHORT);
        var dateStr_1 = dateInfo_1.month.format("%02d") + "/" + dateInfo_1.day.format("%02d");
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(104, 167, 52, 16);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(1);
        dc.drawLine(104, 167, 156, 167);
        dc.drawLine(156, 167, 156, 183);
        dc.drawLine(156, 183, 104, 183);
        dc.drawLine(104, 183, 104, 167);
        dc.drawText(130, 175, Graphics.FONT_XTINY, dateStr_1, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        // --- Analog Hands ---
        var hAngle = ((clockTime.hour % 12 + clockTime.min / 60.0) * 30.0 * Math.PI) / 180.0;
        var mAngle = ((clockTime.min + clockTime.sec / 60.0) * 6.0 * Math.PI) / 180.0;

        // Hour Hand
        var hx = cx + 55 * Math.sin(hAngle);
        var hy = cy - 55 * Math.cos(hAngle);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(5);
        dc.drawLine(cx, cy, hx, hy);

        // Minute Hand
        var mx = cx + 85 * Math.sin(mAngle);
        var my = cy - 85 * Math.cos(mAngle);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(3);
        dc.drawLine(cx, cy, mx, my);

        // Second Hand (active only in high power / awake mode)
        if (!_isSleep) {
            var sAngle = (clockTime.sec * 6.0 * Math.PI) / 180.0;
            var sx = cx + 100 * Math.sin(sAngle);
            var sy = cy - 100 * Math.cos(sAngle);
            var stx = cx - 18 * Math.sin(sAngle);
            var sty = cy + 18 * Math.cos(sAngle);
            dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
            dc.setPenWidth(1);
            dc.drawLine(stx, sty, sx, sy);
            dc.fillCircle(cx, cy, 3);
        } else {
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.fillCircle(cx, cy, 4);
        }
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
