from PIL import Image
from pathlib import Path
import numpy as np

class GDXLibAtlas:

    def __init__(self, path, entry_filter_fn=None):
        path = Path(path)

        with open(path, 'rt') as f:
            lines = f.readlines()

            meta = lines[1:6]
            data = lines[6:]

            self.atlas = {}
            while len(data) >= 7:
                entry = data[:7]

                if (not entry_filter_fn or entry_filter_fn(entry[0])):

                    self.atlas[entry[0].strip()] = {
                        'rotate': self._parse_bool(entry[1]),
                        'xy': self._parse_tuple(entry[2]),
                        'size': self._parse_tuple(entry[3]),
                        'orig': self._parse_tuple(entry[4]),
                        'offset': self._parse_tuple(entry[5]),
                        'index': self._parse_int(entry[6])
                    }

                data = data[7:]

        self.img_path = meta[0].strip()

    def export_files(self, output_dir, scaledown=0.75):

        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        img = Image.open(self.img_path)

        for key, entry in self.atlas.items():

            img_out = Image.new('RGBA', entry['orig'], (0, 0, 0, 0))

            crop_box = np.tile(entry['xy'], 2)
            crop_box[2:] += entry['size']
            img_crop = img.crop(box=tuple(crop_box))

            img_out.paste(img_crop, entry['offset'])
            # img_out.show()

            path_parts = key.split('/')
            fname = path_parts[-1]
            path_dir = output_dir / '/'.join(path_parts[:-1])
            path_dir.mkdir(parents=True, exist_ok=True)
            path = path_dir / (fname + '.png')

            new_size = tuple(map(lambda x: int(x * scaledown), entry['orig']))

            img_out = img_out.resize(new_size, Image.LANCZOS)

            img_out.save(path)

            print('exported {}'.format(path))

    def _parse_bool(self, line):
        return bool(line.split(': ')[1].strip())

    def _parse_int(self, line):
        return int(line.split(': ')[1].strip())

    def _parse_tuple(self, line):
        return tuple(map(int, line.split(': ')[1].strip().split(',')))



if __name__ == '__main__':
    img_path = "powers.png"
    atlas_path = "powers.atlas"
    output_dir = "../frontend/img/powers/"

    atlas = GDXLibAtlas(atlas_path, lambda x: x.startswith('48'))

    atlas.export_files(output_dir)
