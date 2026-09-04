/**
 * مدخل حزمة Three.js المدمجة في الملفّ الواحد: يُعاد تصدير ما يحتاجه مسرح المجلس المجسّم فقط،
 * ويُحزم بـ esbuild إلى src/vendor/three-global.js (كائن عامّ THREE) بالأداة tools/build-three.mjs.
 */
export {
 Scene, PerspectiveCamera, WebGLRenderer, Group, Mesh, Object3D, Color, Vector2, Vector3, Quaternion, Euler, MathUtils, Raycaster, Clock,
 MeshStandardMaterial, MeshBasicMaterial, MeshLambertMaterial, SpriteMaterial, Sprite, PointsMaterial, Points,
 SphereGeometry, CylinderGeometry, BoxGeometry, PlaneGeometry, TorusGeometry, LatheGeometry, CapsuleGeometry, RingGeometry, CircleGeometry, ConeGeometry,
 Shape, Path, ShapeGeometry, ExtrudeGeometry, BufferGeometry, Float32BufferAttribute,
 CanvasTexture, RepeatWrapping, SRGBColorSpace, LinearFilter, LinearMipmapLinearFilter,
 AmbientLight, HemisphereLight, DirectionalLight, PointLight, SpotLight,
 PCFSoftShadowMap, DoubleSide, FrontSide, BackSide, Fog, FogExp2, AdditiveBlending, NormalBlending, ACESFilmicToneMapping, NoToneMapping
} from 'three';
