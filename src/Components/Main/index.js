import BaseImage from "../../Assets/base.png";
import OverlayImage from "../../Assets/overlay.png";
import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import axios from 'axios';
import { ReactComponent as Loading } from '../../Assets/loading.svg';
import { Buffer } from 'buffer';

const isUrl = (string) => {
    var res = string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    return (res !== null)
};

const getDataUrl = async (image) => {
    let blob = await fetch(image).then(r => r.blob());
    let dataUrl = await new Promise(resolve => {
      let reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      return reader.readAsDataURL(blob);      
    });
    return dataUrl;
};

export default function Main() {
    const imageDiv = useRef();
    const bodyDiv = useRef();
    const [imageUrl, setImageUrl] = useState("");
    const [search, setSearch] = useState("");
    const [trackSearch, setTrackSearch] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [token, setToken] = useState({ token: "", expires: 0 });
    const [image, setImage] = useState("");

    useEffect(() => {
        findAlbumCover("pajubá");
    }, []);

    const findAlbumCover = async (search) => {
        if (!search)
            return;

        setError(false);
        setLoading(true);
        setImage("");
        const axiosClient = axios.create();
        const query = `${trackSearch ? "track" : "album"}:${search}`;
        await new Promise((r) => setTimeout(r, 500));

        const client_id = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
        const client_secret = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET;
        var tempToken = "";
        var tempImageUrl = "";

        if (token.token === "" || token.expires <= Date.now()) {
            axiosClient.defaults.headers.authorization = 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'));
            await axiosClient.post('https://accounts.spotify.com/api/token', "grant_type=client_credentials").then(res => {
                tempToken = res.data.access_token;
                setToken({ token: res.data.access_token, expires: Date.now() + (res.data.expires_in * 1000) });

            }).catch(err => {
                setImage("");
                setError(true);
            })
        }
        else
            tempToken = token.token;

        axiosClient.defaults.headers.authorization = "Bearer " + tempToken;

        if (isUrl(search)) {
            const trackIdByUrl = search.split("/").pop();
            const isAlbum = search.includes("album");


            await axiosClient.get(`https://api.spotify.com/v1/${isAlbum ? "albums" : "tracks"}/${trackIdByUrl}`).then(async (res) => {
                const url = isAlbum ? res.data.images[0].url : res.data.album.images[0].url;
                tempImageUrl = url;
                setImageUrl(await getDataUrl(url));
            }).catch(err => {
                setImage("");
                setError(true);
            })
        }
        else {
            await axiosClient.get(`https://api.spotify.com/v1/search?q=${query}&type=${!trackSearch ? "album" : "track"}&limit=1`)
                .then(async (res) => {
                    const url = !trackSearch ? res.data.albums.items[0].images[0].url : res.data.tracks.items[0].album.images[0].url;
                    tempImageUrl = url;
                    setImageUrl(await getDataUrl(url));
                })
                .catch(err => {
                    setImage("");
                    setError(true);
                })
        }

        setImage("");
        setTimeout(() => {
            setLoading(false);
            if (!error && tempImageUrl !== "" && imageDiv.current) {
                imageDiv.current.classList.remove("hidden");
                html2canvas(imageDiv.current, { allowTaint:true, cacheBust: true, width: 400, height: 400 })
                    .then(function (canvas) {
                        const canvasAsDataUrl = canvas.toDataURL("image/png");
                        setImage(canvasAsDataUrl);
                        imageDiv.current.classList.add("hidden");
                    })
                    .catch(function (error) {
                        setImage("");
                        setError(true);
                    });
            }
        }, 1000);

    }

    const downloadImage = () => {
        if (image !== "") {
            const a = document.createElement("a");
            a.href = image;
            a.download = "Nanacita.png";
            a.click();
        }
    }

    return (
        <main className="flex flex-col items-center p-16 w-screen h-screen overflow-hidden bg-pink-200">
            <div className="flex flex-col w-96 h-fit bg-white rounded-3xl p-3">
                <p className="text-center font-bold text-2xl">nanacita generator</p>

                <label className="my-3">
                    <input
                        type="checkbox"
                        checked={trackSearch}
                        onChange={() => setTrackSearch(!trackSearch)}
                        className="mr-1"
                    />
                    busca por faixa
                </label>

                <input defaultValue={search} type="text" onChange={(e) => setSearch(e.target.value)} className="w-full h-12 p-2 rounded-lg bg-gray-200" placeholder={`nome ou URL (Spotify) ${trackSearch ? "da faixa" : "do álbum"} aqui...`} />
                <button onClick={() => findAlbumCover(search)} className={`mt-2 w-[50%] self-center h-12 p-2 rounded-lg bg-gray-200 ${search !== "" && "hover:bg-gray-400"} transition-all ease-in-out ${search === "" && "opacity-50"}`} >gerar</button>
            </div>

            <div ref={bodyDiv} className="mt-8 bg-white p-6 lg:p-16 rounded-3xl flex flex-col items-center ">
                {error ? <p>nada encontrado</p> : loading && <Loading className="m-auto" />}
                {image &&
                    (<>
                        <img src={image} className="w-full h-full max-h-[400px] max-w-[400px]" alt="Nanacita" />
                        <button onClick={downloadImage} className="mt-5 w-[50%] self-center h-12 p-2 rounded-lg bg-gray-200 hover:bg-gray-400 transition-all ease-in-out">baixar</button>
                    </>)
                }
                <div ref={imageDiv} className="hidden relative w-[800px] scale-50 h-[800px] bg-cover" style={{ backgroundImage: `url(${BaseImage})` }}>
                    <div className="w-[49.01%] h-[49.01%] absolute z-1 rotate-[14.6deg] left-[43.65%] top-[16.90%] bg-cover" style={{ backgroundImage: `url(${imageUrl})` }} />
                    <img src={OverlayImage} className="absolute z-2 w-full h-full" alt="Overlay" />
                </div>
            </div>
                <p className="mt-auto text-white"> web app feito por <a href="https://github.com/lfnandoc">@lfnandoc</a> </p>
                <p className="mt-auto text-white"> um bjo pra <a href="https://twitter.com/linndaquebrada">naiara</a> e pra <a href="https://twitter.com/linndaquebrada">lina</a> 🤍 </p>

        </main>

    );
}