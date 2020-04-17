import os


def crawl_file(imgs, path):
    
    if os.path.isfile(path) and path.endswith('.png'):
        imgs.append(path)
    elif os.path.isdir(path):
        for file in os.listdir(path):
            crawl_file(imgs, path + '/' + file)


if __name__ == '__main__':
    
    # path = 'img'
    
    imgs = []
    
    crawl_file(imgs, 'img')
    
    print(imgs)