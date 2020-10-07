import httplib
from json import loads, dumps
import time

def read_message(path):
    with open(path, 'rt') as f:
        return f.readline()


def post(url, json):

    conn = httplib.HTTPSConnection(url)
    conn.request('POST', '/', json, {"Content-type": "application/json", "Accept": "application/json"})
    response = conn.getresponse()
    print(response.status, response.reason)


if __name__ == '__main__':

    msg_okay = read_message('okay_msg.txt')
    msg_tips = read_message('tips_msg.txt')
    msg_deck = read_message('deck_msg.txt')

    # url = 'slaytherelics.xyz:8081'
    url = 'localhost:8080'
    # json = loads(msg)

    while True:
        print('broadcast ' + str(time.time()))
        try:
            post(url, msg_okay)
            post(url, msg_tips)
            post(url, msg_deck)
        except Exception as e:
            print(e)
        # resp = requests.post(url, json=json, allow_redirects=False)
        time.sleep(1.2)