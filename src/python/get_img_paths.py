import os


def crawl_file(imgs, path, ignoredirs):
    
    if os.path.isfile(path) and path.endswith('.png'):
        imgs.append(path)
    elif os.path.isdir(path):
        ignore = False
        for dir in ignoredirs:
            if path.endswith('/' + dir):
                ignore = True
                
        if not ignore:
            for file in os.listdir(path):
                crawl_file(imgs, path + '/' + file, ignoredirs)


if __name__ == '__main__':
    
    # path = 'img'
    
    imgs = []
    
    basepath = '../frontend/img'
    outpath = 'img'
    
    crawl_file(imgs, basepath, ['cards', 'cards_small'])
    
    print([img.replace(basepath, outpath) for img in imgs])