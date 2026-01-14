using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace AutoFilling
{
    public static class GridSerializer
    {
        public class Item3D
        {
            public string Tipo { get; set; } = ""; 
            public string Subtipo { get; set; } = ""; 
            public int X { get; set; }
            public int Y { get; set; }
            public int Rotacion { get; set; }
        }

        public static string GenerarJson(GridState state)
        {
            var lista = new List<Item3D>();

            for (int r = 0; r < state.Filas; r++)
            {
                for (int c = 0; c < state.Columnas; c++)
                {
                    bool ocupado = state.Rectangulos.Any(rect => r >= rect.R1 && r <= rect.R2 && c >= rect.C1 && c <= rect.C2);
                    if (!ocupado) continue;

                    var rect = state.Rectangulos.First(rect => r >= rect.R1 && r <= rect.R2 && c >= rect.C1 && c <= rect.C2);
                    bool esBordeBase = (r == rect.R1 || r == rect.R2 || c == rect.C1 || c == rect.C2);

                    if (!esBordeBase)
                    {
                        lista.Add(new Item3D { Tipo = "Lona", Subtipo = "Centro", X = c, Y = r, Rotacion = 0 });
                    }
                    else
                    {
                        int rot = 0;
                        if (r == rect.R1) rot = 180;
                        else if (r == rect.R2) rot = 0;
                        else if (c == rect.C1) rot = 90;
                        else if (c == rect.C2) rot = 270;
                        
                        lista.Add(new Item3D { Tipo = "Pad", Subtipo = "Borde", X = c, Y = r, Rotacion = rot });
                    }

                    
                    bool mTop = !Ocupado(state, r - 1, c);
                    bool mLeft = !Ocupado(state, r, c - 1);
                    
                    if (mTop) lista.Add(new Item3D { Tipo = "Malla", Subtipo = "Panel", X = c, Y = r, Rotacion = 0 });
                    
                    if (mTop || mLeft) 
                    {
                        bool esEstructural = (mTop && mLeft); 
                        
                        string key = $"{r},{c},TL";
                        bool activoManual = state.PostesActivos.Contains(key);
                        
                        if (esEstructural || activoManual)
                        {
                            lista.Add(new Item3D { 
                                Tipo = "Poste", 
                                Subtipo = esEstructural ? "Estructural" : "Intermedio", 
                                X = c, Y = r, Rotacion = 0 
                            });
                        }
                    }
                }
            }
            return JsonSerializer.Serialize(lista);
        }

        private static bool Ocupado(GridState s, int r, int c) => s.Rectangulos.Any(rect => r >= rect.R1 && r <= rect.R2 && c >= rect.C1 && c <= rect.C2);
    }
}