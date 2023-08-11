import {useEffect, useRef, useState} from "preact/compat";

const Painter = () => {
    const [intensity, setIntensity] = useState(25);
    const [radius, setRadius] = useState(4);
    const [processing, setProcessing] = useState(false);

    const originalImage = useRef<HTMLCanvasElement>()
    const processedImage = useRef<HTMLCanvasElement>()

    const drawImageByUrl = (url) => {
        const img = new Image()

        img.addEventListener('load', function () {
            originalImage.current.width = (this.width); // /2
            originalImage.current.height = (this.height); // /2

            const originalImageCtx = originalImage.current.getContext("2d")
            originalImageCtx.drawImage(this, 0, 0, originalImage.current.width, originalImage.current.height);
        });

        img.crossOrigin = "Anonymous"
        img.src = url
    }

    const uploadLocalImage = (imageFile) => {
        const reader = new FileReader();

        reader.addEventListener('load', () => {
            drawImageByUrl(reader.result)
        })

        reader.readAsDataURL(imageFile);
    }

    const applyOilEffect = () => {
        // inspired by https://codepen.io/loktar00/pen/Rwgxor

        const originalImageCtx = originalImage.current.getContext("2d")
        const processedImageCtx = processedImage.current.getContext("2d")

        setProcessing(true);

        const width = originalImage.current.width,
            height = originalImage.current.height,
            imgData = originalImageCtx.getImageData(0, 0, width, height),
            pixData = imgData.data;

        processedImage.current.width = width;
        processedImage.current.height = height;

        const destImageData = processedImageCtx.createImageData(width, height),
            destPixData = destImageData.data,
            intensityLUT = [],
            rgbLUT = [];

        for (var y = 0; y < height; y++) {
            intensityLUT[y] = [];
            rgbLUT[y] = [];

            for (var x = 0; x < width; x++) {
                var idx = (y * width + x) * 4,
                    r = pixData[idx],
                    g = pixData[idx + 1],
                    b = pixData[idx + 2],
                    avg = (r + g + b) / 3;

                intensityLUT[y][x] = Math.round((avg * intensity) / 255);

                rgbLUT[y][x] = {
                    r: r,
                    g: g,
                    b: b
                };
            }
        }

        for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
                const pixelIntensityCount = [];

                // Find intensities of nearest pixels within radius.
                for (var yy = -radius; yy <= radius; yy++) {
                    for (var xx = -radius; xx <= radius; xx++) {
                        if (y + yy > 0 && y + yy < height && x + xx > 0 && x + xx < width) {
                            const intensityVal = intensityLUT[y + yy][x + xx];

                            if (!pixelIntensityCount[intensityVal]) {
                                pixelIntensityCount[intensityVal] = {
                                    val: 1,
                                    r: rgbLUT[y + yy][x + xx].r,
                                    g: rgbLUT[y + yy][x + xx].g,
                                    b: rgbLUT[y + yy][x + xx].b
                                }
                            } else {
                                pixelIntensityCount[intensityVal].val++;
                                pixelIntensityCount[intensityVal].r += rgbLUT[y + yy][x + xx].r;
                                pixelIntensityCount[intensityVal].g += rgbLUT[y + yy][x + xx].g;
                                pixelIntensityCount[intensityVal].b += rgbLUT[y + yy][x + xx].b;
                            }
                        }
                    }
                }

                pixelIntensityCount.sort( (a, b) => {
                    return b.val - a.val;
                });

                const curMax = pixelIntensityCount[0].val, dIdx = (y * width + x) * 4;

                destPixData[dIdx] = ~~ (pixelIntensityCount[0].r / curMax);
                destPixData[dIdx + 1] = ~~ (pixelIntensityCount[0].g / curMax);
                destPixData[dIdx + 2] = ~~ (pixelIntensityCount[0].b / curMax);
                destPixData[dIdx + 3] = 255;
            }
        }

        // change this to ctx to instead put the data on the original canvas
        processedImageCtx.putImageData(destImageData, 0, 0);

        setProcessing(false);
    }

    useEffect(() => {
        drawImageByUrl("https://images.pexels.com/photos/17619209/pexels-photo-17619209/free-photo-of-light-road-traffic-vacation.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2")
    }, [])

    return (
        <>
            <div>
                <h2>Original</h2>
                <canvas ref={originalImage} id="original-image"></canvas>
                <div className="uploader">
                    <input type="file" accept ="image/*" onChange={(event) => uploadLocalImage(event.target.files[0])}/>
                </div>
                <div className="params">
                    <input type="number" name="intensity" value={intensity} onChange={(event) => setIntensity(event.target.value)} />
                    <input type="number" name="radius" value={radius} onChange={(event) => setRadius(event.target.value)} />
                    <button onClick={() => applyOilEffect()}>Apply</button>
                </div>
            </div>
            <div>
                <h2>Oil Painting Effect {processing && <span>(processing..)</span>}</h2>
                <div>
                    {processing && <span className="loader"></span>}
                    <canvas ref={processedImage} id="processed-image"></canvas>
                </div>
            </div>
        </>
    )
}

export default Painter;
