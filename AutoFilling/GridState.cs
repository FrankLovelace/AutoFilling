using System;
using System.Collections.Generic;

namespace AutoFilling
{
    public class RectanguloData
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public int R1 { get; set; } 
        public int R2 { get; set; } 
        public int C1 { get; set; }
        public int C2 { get; set; } 
    }

    public class GridState
    {
        public int Filas { get; private set; } = 10;
        public int Columnas { get; private set; } = 10;
        public List<RectanguloData> Rectangulos { get; private set; } = new();

        public event Action? OnChange;

        public void ActualizarDimensiones(int filas, int cols)
        {
            Filas = filas;
            Columnas = cols;
            Rectangulos.RemoveAll(r => r.R2 >= Filas || r.C2 >= Columnas);
            NotificarCambios();
        }

        public void AgregarRectangulo(int r1, int c1, int r2, int c2)
        {
            var nuevo = new RectanguloData 
            { 
                R1 = Math.Min(r1, r2), R2 = Math.Max(r1, r2),
                C1 = Math.Min(c1, c2), C2 = Math.Max(c1, c2)
            };
            Rectangulos.Add(nuevo);
            NotificarCambios();
        }

        private void NotificarCambios() => OnChange?.Invoke();
    }
}