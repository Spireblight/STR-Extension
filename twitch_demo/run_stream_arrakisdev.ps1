ffmpeg.exe -framerate 15 -re -loop 1 -i screen.png -f flv -vcodec libx264 -s 1280x720 -b 500k -pix_fmt yuv420p -r 15 -g 30 "rtmp://live-prg.twitch.tv/app/live_493871152_S7zyXM6uaT3jMTiYQjUnq5Vc28RmxN"