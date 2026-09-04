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

        // Complication: Battery (progress bar) (#1)
        var bat_0 = (sysStats != null && sysStats.battery != null) ? sysStats.battery.toNumber() : 0;
        var batCol_0 = (bat_0 <= 20) ? Graphics.COLOR_RED : Graphics.COLOR_WHITE;
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(112, 185, 36, 6);
        dc.setColor(batCol_0, Graphics.COLOR_TRANSPARENT);
        var batW_0 = 36 * bat_0 / 100;
        if (batW_0 > 0) {
            dc.fillRectangle(112, 185, batW_0, 6);
        }
        dc.setColor(batCol_0, Graphics.COLOR_TRANSPARENT);
        dc.drawText(130, 179, Graphics.FONT_XTINY, bat_0.toString() + "%", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        // --- Analog Hands ---
        var hAngle = ((clockTime.hour % 12 + clockTime.min / 60.0) * 30.0 * Math.PI) / 180.0;
        var mAngle = ((clockTime.min + clockTime.sec / 60.0) * 6.0 * Math.PI) / 180.0;

        // Hour Hand
        var hx = cx + 60 * Math.sin(hAngle);
        var hy = cy - 60 * Math.cos(hAngle);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2);
        dc.drawLine(cx, cy, hx, hy);

        // Minute Hand
        var mx = cx + 90 * Math.sin(mAngle);
        var my = cy - 90 * Math.cos(mAngle);
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(1);
        dc.drawLine(cx, cy, mx, my);

        // Second Hand (active only in high power / awake mode)
        if (!_isSleep) {
            var sAngle = (clockTime.sec * 6.0 * Math.PI) / 180.0;
            var sx = cx + 100 * Math.sin(sAngle);
            var sy = cy - 100 * Math.cos(sAngle);
            var stx = cx - 18 * Math.sin(sAngle);
            var sty = cy + 18 * Math.cos(sAngle);
            dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
            dc.setPenWidth(1);
            dc.drawLine(stx, sty, sx, sy);
            dc.fillCircle(cx, cy, 3);
        } else {
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
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
