minify ..\frontend\viewer.js -o ..\frontend\viewer.min.js --simplify --mangle
minify ..\frontend\config.js -o ..\frontend\config.min.js --simplify --mangle

Remove-Item -Path ..\_frontend_out -Recurse
md ..\_frontend_out

Copy-Item -Path ..\frontend\img, ..\frontend\config_style.css, ..\frontend\config.html, ..\frontend\config.min.js, ..\frontend\jquery-3.3.1.min.js, ..\frontend\video_overlay_style.css, ..\frontend\video_overlay.html, ..\frontend\viewer.min.js, ..\frontend\lz-string.min.js -Destination ..\_frontend_out -Recurse

#Compress-Archive -Path ..\frontend\img, ..\frontend\config_style.css, ..\frontend\config.html, ..\frontend\config.min.js, ..\frontend\jquery-3.3.1.min.js, ..\frontend\video_overlay_style.css, ..\frontend\video_overlay.html, ..\frontend\viewer.min.js, ..\frontend\lz-string.min.js, ..\frontend\viewer.js, ..\frontend\config.js -DestinationPath ..\frontend\frontend.zip -Force

#Compress-Archive -Path ..\frontend\img, ..\frontend\config_style.css, ..\frontend\config.html, ..\frontend\config.min.js, ..\frontend\jquery-3.3.1.min.js, ..\frontend\video_overlay_style.css, ..\frontend\video_overlay.html, ..\frontend\viewer.min.js, ..\frontend\lz-string.min.js -DestinationPath ..\frontend\frontend.zip -Force