ffmpeg.exe -framerate 15 -re -loop 1 -i screen.png -f flv -vcodec libx264 -s 1280x720 -b 500k -pix_fmt yuv420p -r 15 -g 30 "rtmp://live-lhr03.twitch.tv/app/live_32044102_URhJcW5uklHvLSADmrjk3Ey0WKeZfK"